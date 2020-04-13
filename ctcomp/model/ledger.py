from cantools import db
from cantools.util import error, log
from ctcomp.mint import mint, balance

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
	variety = db.String(choices=["ledger", "deed", "rebuild"], default="ledger")
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
			wline = "%s: %s counted; %s recorded"%(self.key.urlsafe(),
				lb, w.outstanding)
			deetz.append(wline)
			log(wline)
			if w.outstanding != lb:
				self.counts["flagged"] += 1
		self.details = "\n".join(deetz)
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
		self.put()

	def rebuild(self):
		log("rebuilding ledgers", important=True)