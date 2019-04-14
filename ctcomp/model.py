from cantools import db
from ctuser.model import CTUser

class Wallet(db.TimeStampedBase):
	identifier = db.String() # for now or whatever

	def deposit(self, amount):
		# TODO: create a token!! put it in the right account! <---
		pass

class Person(CTUser):
	ip = db.String()                    # optional
	wallet = db.ForeignKey(kind=Wallet) # optional

class Pod(db.TimeStampedBase):
	name = db.String()
	pool = db.ForeignKey(kind=Wallet)

	def deposit(self, member, amount):
		member.wallet.get().deposit(amount)
		self.pool.get().deposit(amount)

	def members(self):
		return [mem.person for mem in Membership.query(Membership.pod == self.key).fetch()]

class Membership(db.TimeStampedBase):
	pod = db.ForeignKey(kind=Pod)
	person = db.ForeignKey(kind=Person)

class Content(db.TimeStampedBase):
	membership = db.ForeignKey(kind=Membership)
	identifier = db.String() # some hash, defaulting to url

class View(db.TimeStampedBase):
	viewer = db.ForeignKey(kind=Person)
	content = db.ForeignKey(kind=Content)