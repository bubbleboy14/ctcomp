from cantools import db, config
from cantools.util import error, log
from ctcomp.mint import mint, balance

try:
    input = raw_input # py2/3 compatibility
except NameError:
    pass

class Wallet(db.TimeStampedBase):
	identifier = db.String() # public key
	outstanding = db.Float(default=0)

	def balance(self):
		if not self.identifier:
			error("your wallet is not set up")
		return balance(self.identifier)

	def mint(self, amount):
		if not self.identifier:
			error("your wallet is not set up")
		if amount > self.outstanding:
			error("you don't have that much!")
		if mint(self.identifier, amount):
			self.outstanding -= amount
			self.put()

	def ledger(self):
		return LedgerItem.query(LedgerItem.wallet == self.key).all()

	def ledger_balance(self):
		b = 0
		for item in self.ledger():
			if item.polytype == "debit":
				b -= item.amount
			else: # deposit
				b += item.amount
		return b

	def debit(self, amount, pod, deed, note, details=None):
		if amount > self.outstanding:
			error("you don't have that much!")
		Debit(wallet=self.key, pod=pod.key, deed=deed.key,
			amount=amount, note=note, details=details).put()
		self.outstanding -= amount
		self.put()

	def deposit(self, amount, pod, deed, note, details=None):
		Deposit(wallet=self.key, pod=pod.key, deed=deed.key,
			amount=amount, note=note, details=details).put()
		self.outstanding += amount
		self.put()

class LedgerItem(db.TimeStampedBase):
	wallet = db.ForeignKey(kind=Wallet)
	pod = db.ForeignKey(kind="Pod")
	deed = db.ForeignKey() # various options
	amount = db.Float()
	note = db.String()
	details = db.Text()

class Deposit(LedgerItem):
	pass

class Debit(LedgerItem):
	pass

class PayBatch(db.TimeStampedBase):
	count = db.Integer(default=0)
	variety = db.String()
	details = db.Text()

class Audit(db.TimeStampedBase):
	variety = db.String(choices=["ledger", "deed", "rebuild"])
	counts = db.JSON()
	details = db.Text()

	def ledger(self): # compare ledger total with recorded balance
		log("ledger audit", important=True)
		wallz = Wallet.query().all()
		self.counts = {
			"flagged": 0,
			"wallets": len(wallz)
		}
		deetz = []
		for w in wallz:
			lb = w.ledger_balance()
			wline = "%s: %s counted; %s recorded"%(w.key.urlsafe(),
				lb, w.outstanding)
			deetz.append(wline)
			log(wline)
			if w.outstanding != lb:
				self.counts["flagged"] += 1
		self.details = "\n".join(deetz)
		self.variety = "ledger"
		self.put()

	def _count(self, modname, deetz):
		items = db.get_model(modname).query().all()
		cz = {
			'total': len(items),
			'unledgered': 0,
			'value': 0
		}
		for item in items:
			if not LedgerItem.query(LedgerItem.deed == item.key).get():
				cz['unledgered'] += 1
				if modname != "verifiable":
					cz['value'] += item.total()
		dline = "%s: %s total; %s unledgered; %s value"%(modname,
			cz['total'], cz['unledgered'], cz['value'])
		deetz.append(dline)
		log(dline)
		return cz

	def deed(self):
		# this function is for the purpose of ascertaining
		# the scope of unledgered deeds (at the time of
		# the ledger's implementation)
		log("deed audit", important=True)
		self.counts = {}
		deetz = []
		for mname in ["view", "resource", "contribution", "verifiable"]:
			self.counts[mname] = self._count(mname, deetz)
		# check for and count up (per recip wallet?) non-ledgerized deeds
		# + view
		# + resource
		# + contribution
		# - verifiable
		#   - special-case commitment.....
		# - stewardship
		self.details = "\n".join(deetz)
		self.variety = "deed"
		self.put()

	def _process(self, modname, cb=None):
		items = db.get_model(modname).query().all()
		log("processing %s %s items"%(len(items), modname))
		for item in items:
			if cb:
				cb(item)
			else:
				item.process()
		return len(items)

	def _clear(self):
		ledgies = LedgerItem.query().all()
		if input("delete %s LedgerItem records? "%(len(ledgies),)) != "yes":
			error("k bye!")
		log("deleting %s ledgies!"%(len(ledgies),))
		db.delete_multi(ledgies)
		wallz = Wallet.query().all()
		log("setting %s wallets back to zero"%(len(wallz),))
		worigz = {}
		for wall in wallz:
			wk = wall.key.urlsafe()
			log("%s: %s"%(wk, wall.outstanding))
			worigz[wk] = wall.outstanding
			wall.outstanding = 0
		db.put_multi(wallz)
		return worigz

	def rebuild(self):
		# *** use with care ***
		# ******* really don't use *********
		# this function deletes all LedgerItems, sets
		# all wallets back to zero, and reprocesses
		# views and contributions.
		# purpose: rebuild legitimate ledger (leaving
		# much out) ASAP now that we have ledgers :)
		if not config.ctcomp.allowrebuild:
			error("nope!")
		log("rebuilding ledgers", important=True)
		worigz = self._clear()
		cbatch = PayBatch(variety="ledger initialization")
		cbatch.put()
		lv = self._process("view")
		lc = self._process("contribution",
			lambda item : item.process(cbatch, item.count))
		cbatch.details = "processed %s Contribution records"%(lc,)
		cbatch.count = lc
		cbatch.put()
		wallz = Wallet.query().all()
		deetz = [
			"views: %s"%(lv,),
			"contributions: %s"%(lc,)
		]
		self.counts = {
			'wallets': {
				'total': len(wallz),
				'updated': 0
			},
			'views': lv,
			'contributions': lc
		}
		for wall in wallz:
			wk = wall.key.urlsafe()
			o = worigz[wk]
			n = wall.outstanding
			if o != n:
				self.counts['wallets']['updated'] += 1
				dline = "%s: %s -> %s"%(wk, o, n)
				deetz.append(dline)
				log(dline)
		self.details = "\n".join(deetz)
		self.variety = "rebuild"
		self.put()