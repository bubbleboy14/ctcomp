from cantools import db
from ctcoop.model import Member
from ctdecide.model import Proposal

class Wallet(db.TimeStampedBase):
	identifier = db.String() # for now or whatever

	def deposit(self, amount):
		# TODO: create a token!! put it in the right account! <---
		pass

class Person(Member):
	ip = db.String()                    # optional
	wallet = db.ForeignKey(kind=Wallet) # optional

class Pod(db.TimeStampedBase):
	name = db.String()
	pool = db.ForeignKey(kind=Wallet)

	def proposals(self):
		return sum([m.proposals for m in self.members(True)], [])

	def members(self, noperson=False):
		mems = Membership.query(Membership.pod == self.key).fetch()
		return noperson and mems or [mem.person for mem in mems]

	def deposit(self, member, amount):
		member.wallet.get().deposit(amount)
		self.pool.get().deposit(amount)

	def service(self, member, service, recipient_count):
		self.deposit(member, service.compensation * recipient_count)

class Membership(db.TimeStampedBase):
	pod = db.ForeignKey(kind=Pod)
	person = db.ForeignKey(kind=Person)
	proposals = db.ForeignKey(kind=Proposal, repeated=True)

class Content(db.TimeStampedBase):
	membership = db.ForeignKey(kind=Membership)
	identifier = db.String() # some hash, defaulting to url

class View(db.TimeStampedBase):
	viewer = db.ForeignKey(kind=Person)
	content = db.ForeignKey(kind=Content)

class Service(db.TimeStampedBase):
	name = db.String()
	compensation = db.Float(default=1.0)

class Act(db.TimeStampedBase):
	service = db.ForeignKey(kind=Service)
	pod = db.ForeignKey(kind=Pod)
	workers = db.ForeignKey(kind=Person, repeated=True)
	beneficiaries = db.ForeignKey(kind=Person, repeated=True)
	notes = db.Text()

	def deposit(self):
		if not self.verified():
			return False
		count = len(self.beneficiaries)
		pod = self.pod.get()
		service = self.service.get()
		for worker in db.get_multi(self.workers):
			pod.service(worker, service, count)
		return True

	def verify(self, person):
		if person in self.beneficiaries:
			Verification(act=self.key, person=person).put()
			return self.deposit()

	def verified(self):
		for person in self.beneficiaries:
			if not Verification.query(Verification.act == self.key, Verification.person == person).get():
				return False
		return True

class Request(db.TimeStampedBase):
	action = db.String(choices=["include", "exclude"])
	person = db.ForeignKey(kind=Person)
	pod = db.ForeignKey(kind=Pod)
	notes = db.Text()

	def fulfill(self):
		if not self.verified():
			return False
		if self.action == "exclude":
			Membership.query(Membership.pod == self.pod, Membership.person == self.person).rm()
		else: # include
			Membership(pod=self.pod, person=self.person).put()
		return True

	def verify(self, person):
		if person in self.pod.members():
			Verification(act=self.key, person=person).put()
			return self.fulfill()

	def verified(self):
		for person in self.pod.members():
			if not Verification.query(Verification.act == self.key, Verification.person == person).get():
				return False
		return True

class Verification(db.TimeStampedBase):
	act = db.ForeignKey(kinds=[Act, Request])
	person = db.ForeignKey(kind=Person)