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

class Content(db.TimeStampedBase):
	owner = db.ForeignKey(kind=Person)
	identifier = db.String() # some hash, defaulting to url

class View(db.TimeStampedBase):
	viewer = db.ForeignKey(kind=Person)
	content = db.ForeignKey(kind=Content)