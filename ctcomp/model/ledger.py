from cantools import db, config
from cantools.util import error, log
from ctcomp.mint import mint, balance

ratios = config.ctcomp.ratios

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

