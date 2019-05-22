from datetime import datetime, timedelta
from cantools import db
from cantools.util import log, error
from cantools.web import email_admins
from ctcoop.model import Member
from ctdecide.model import Proposal

class Wallet(db.TimeStampedBase):
	identifier = db.String() # public key
	outstanding = db.Integer(default=0)

	def deposit(self, amount):
		if self.identifier:
			if self.outstanding:
				amount += self.outstanding
				self.outstanding = 0
				self.put()
			# TODO: create/issue amount
		else:
			self.outstanding += amount
			self.put()

class Person(Member):
	ip = db.String()                    # optional
	wallet = db.ForeignKey(kind=Wallet) # optional

	def onjoin(self):
		email_admins("New Person", self.email)
		self.enroll(global_pod())
		wallet = Wallet()
		wallet.put()
		self.wallet = wallet.key
		self.put()

	def enroll(self, pod):
		memship = Membership(pod=pod.key, person=self.key)
		memship.put()
		return memship.key

	def memberships(self):
		return Membership.query(Membership.person == self.key).fetch()

	def acts(self):
		yesterday = datetime.now() - timedelta(1)
		return sum([Act.query(Act.membership == m.key,
			Act.created > yesterday).fetch() for m in self.memberships()], [])

	def commitments(self):
		return sum([Commitment.query(Commitment.membership == m.key).fetch() for m in self.memberships()], [])

class Pod(db.TimeStampedBase):
	name = db.String()
	variety = db.String()
	pool = db.ForeignKey(kind=Wallet)
	agent = db.ForeignKey(kind="Pod")

	def oncreate(self):
		email_admins("New Pod", "name: %s\nvariety: %s"%(self.name, self.variety))
		if not self.pool:
			w = Wallet()
			w.put()
			self.pool = w.key

	def _collection(self, mod):
		return sum([mod.query(mod.membership == m.key).fetch() for m in self.members(True)], [])

	def acts(self):
		return self._collection(Act)

	def requests(self):
		return self._collection(Request)

	def commitments(self):
		return self._collection(Commitment)

	def proposals(self):
		return sum([m.proposals for m in self.members(True)], [])

	def members(self, noperson=False):
		mems = Membership.query(Membership.pod == self.key).fetch()
		return noperson and mems or [mem.person for mem in mems]

	def deposit(self, member, amount):
		member.wallet.get().deposit(amount)
		self.pool.get().deposit(amount)
		self.agent and self.agent.get().pool.get().deposit(amount)

	def service(self, member, service, recipient_count):
		self.deposit(member, service.compensation * recipient_count)

def global_pod():
	p = Pod.query().get() # pod #1
	if not p:
		p = Pod()
		p.name = "Global"
		p.oncreate()
		p.put()
	return p

class Membership(db.TimeStampedBase):
	pod = db.ForeignKey(kind=Pod)
	person = db.ForeignKey(kind=Person)
	proposals = db.ForeignKey(kind=Proposal, repeated=True)

	def deposit(self, amount):
		self.pod.get().deposit(self.person.get(), amount)

class Content(db.TimeStampedBase):
	membership = db.ForeignKey(kind=Membership)
	identifier = db.String() # some hash, defaulting to url

def enroll(agent, person):
	return db.get(person).enroll(Pod.query(Pod.agent == agent).get()).urlsafe()

def manage(agent, membership, content): # allow multi-pod agents?
	memship = db.get(membership)
	if memship.pod != Pod.query(Pod.agent == agent).get().key:
		error("wrong!")
	con = Content(identifier=content, membership=membership)
	con.put()
	return con.key.urlsafe()

class View(db.TimeStampedBase):
	viewer = db.ForeignKey(kind=Person)
	content = db.ForeignKey(kind=Content)

class Service(db.TimeStampedBase):
	name = db.String()
	variety = db.String()
	compensation = db.Float(default=1.0)

class Verifiable(db.TimeStampedBase):
	membership = db.ForeignKey(kind=Membership)
	passed = db.Boolean(default=False)
	notes = db.Text()

	def pod(self, noget=False):
		pod = self.membership.get().pod
		return noget and pod or pod.get()

	def signers(self):
		return self.pod().members()

	def fulfill(self):
		self.passed = True
		self.put()

	def verify(self, person):
		if person in self.signers():
			Verification(act=self.key, person=person).put()
			return self.fulfill()

	def verified(self):
		if person in self.signers():
			if not Verification.query(Verification.act == self.key, Verification.person == person).get():
				return False
		return True

class Commitment(Verifiable):
	service = db.ForeignKey(kind=Service)
	estimate = db.Float(default=1.0) # per week (hours?)

	def deposit(self, numdays=1):
		service = self.service.get()
		log("compensating commitment: %s service (%s); estimated %s hours per week; paying for %s days"%(service.name,
			service.compensation, self.estimate, numdays))
		self.membership.get().deposit(service.compensation * self.estimate * numdays / 7.0)

def payDay():
	commz = Commitment.query(Commitment.passed == True).fetch()
	log("found %s live commitments"%(len(commz),), important=True)
	for comm in commz:
		comm.deposit()
	log("compensated pods and members corresponding to %s commitments"%(len(commz),), important=True)

class Act(Verifiable):
	service = db.ForeignKey(kind=Service)
	workers = db.ForeignKey(kind=Person, repeated=True)
	beneficiaries = db.ForeignKey(kind=Person, repeated=True)

	def signers(self):
		return self.beneficiaries

	def fulfill(self):
		if self.passed or not self.verified():
			return False
		count = len(self.beneficiaries)
		pod = self.pod()
		service = self.service.get()
		for worker in db.get_multi(self.workers):
			pod.service(worker, service, count)
		self.passed = True
		self.put()
		return True

class Request(Verifiable):
	change = db.String(choices=["include", "exclude"])
	person = db.ForeignKey(kind=Person) # person in question!

	def signers(self):
		return [p for p in self.pod().members() if p != self.person]

	def fulfill(self):
		if self.passed or not self.verified():
			return False
		pod = self.pod(True)
		if self.change == "exclude":
			Membership.query(Membership.pod == pod, Membership.person == self.person).rm()
		else: # include
			Membership(pod=pod, person=self.person).put()
		self.passed = True
		self.put()
		return True

class Verification(db.TimeStampedBase):
	act = db.ForeignKey(kinds=[Act, Request, Commitment])
	person = db.ForeignKey(kind=Person)