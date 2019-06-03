from datetime import datetime, timedelta
from cantools import db, config
from cantools.util import error
from cantools.web import email_admins, fetch, log
from ctcoop.model import Member
from ctdecide.model import Proposal

ratios = config.ctcomp.ratios

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

class Contributor(db.TimeStampedBase):
	handle = db.String()

class Person(Member):
	ip = db.String()                              # optional
	wallet = db.ForeignKey(kind=Wallet)           # optional
	contributor = db.ForeignKey(kind=Contributor) # optional

	def onjoin(self):
		email_admins("New Person", self.email)
		self.enroll(global_pod())
		wallet = Wallet()
		wallet.put()
		self.wallet = wallet.key
		self.put()

	def enroll(self, pod):
		memship = Membership.query(Membership.pod == pod.key,
			Membership.person == self.key).get()
		if not memship:
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
	dependencies = db.ForeignKey(kind="Codebase", repeated=True) # software pod only

	def oncreate(self):
		email_admins("New Pod", "name: %s\nvariety: %s"%(self.name, self.variety))
		if not self.pool:
			w = Wallet()
			w.put()
			self.pool = w.key

	def codebases(self):
		return Codebase.query(Codebase.pod == self.key).fetch()

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

	def deposit(self, member, amount, nocode=False):
		member.wallet.get().deposit(amount)
		self.pool.get().deposit(amount)
		self.agent and self.agent.get().pool.get().deposit(amount * ratios.agent)
		if not nocode:
			for codebase in self.codebases():
				codebase.deposit(amount)
			depcut = amount * ratios.dependency
			for dependency in db.get_multi(self.dependencies):
				dependency.deposit(depcut)

	def service(self, member, service, recipient_count):
		self.deposit(member, service.compensation * recipient_count)

def global_pod():
	p = Pod.query().get() # pod #1
	if not p:
		p = Pod()
		p.name = "Global"
		p.variety = "managed"
		p.oncreate()
		p.put()
	return p

class Membership(db.TimeStampedBase):
	pod = db.ForeignKey(kind=Pod)
	person = db.ForeignKey(kind=Person)
	proposals = db.ForeignKey(kind=Proposal, repeated=True)

	def deposit(self, amount, nocode=False):
		self.pod.get().deposit(self.person.get(), amount, nocode)

class Codebase(db.TimeStampedBase):
	pod = db.ForeignKey(kind=Pod)
	owner = db.String() # bubbleboy14
	repo = db.String()  # ctcomp
	variety = db.String(choices=["platform", "framework", "research and development"])
	dependencies = db.ForeignKey(kind="Codebase", repeated=True)
	label = "repo"

	def deposit(self, amount):
		log('compensating "%s/%s" codebase: %s'%(self.owner, self.repo, amount))
		contz = self.contributions()
		total = float(sum([cont.count for cont in contz]))
		platcut = amount * ratios.code.get(self.variety, ratios.code.rnd)
		log('dividing %s cut (%s) among %s contributors'%(self.variety, platcut, len(contz)))
		for contrib in contz:
			memship = contrib.membership()
			memship and memship.deposit(platcut * contrib.count / total, True)
		depcut = amount * ratios.code.dependency
		dnum = len(self.dependencies)
		depshare = depcut / dnum
		log('dividing dependency cut (%s) among %s codebases'%(depcut, dnum))
		for dep in db.get_multi(self.dependencies):
			dep.deposit(depshare)

	def contributions(self, asmap=False):
		clist = Contribution.query(Contribution.codebase == self.key).fetch()
		if not asmap:
			return clist
		contz = {}
		for cont in clist:
			contz[cont.contributor.get().handle] = cont
		return contz

	def refresh(self):
		freshies = fetch("api.github.com", "/repos/%s/%s/contributors"%(self.owner,
			self.repo), asjson=True, protocol="https")
		for item in freshies:
			log("checking for: %s"%(item["login"],), 1)
			contrib = getContribution(self, item["login"])
			contrib and contrib.refresh(item["contributions"])

class Contribution(db.TimeStampedBase):
	codebase = db.ForeignKey(kind=Codebase)
	contributor = db.ForeignKey(kind=Contributor)
	count = db.Integer(default=0)

	def membership(self):
		person = Person.query(Person.contributor == self.contributor).get()
		pod = db.get(self.codebase).pod
		return person and pod and Membership.query(Membership.pod == pod, Membership.person == person.key).get()

	def refresh(self, total):
		diff = total - self.count
		if diff:
			self.membership().deposit(diff * ratios.code.line, True)
			self.count = total
			self.put()

def getContribution(codebase, handle):
	butor = Contributor.query(Contributor.handle == handle).get()
	if butor:
		bution = Contribution.query(Contribution.codebase == codebase.key,
			Contribution.contributor == butor.key).get()
		if not bution:
			bution = Contribution(codebase=codebase.key, contributor=butor.key)
			bution.put()
		return bution

class Content(db.TimeStampedBase):
	membership = db.ForeignKey(kind=Membership)
	identifier = db.String() # some hash, defaulting to url

def enroll(agent, pkey, person):
	pod = db.get(pkey)
	if pod.agent.urlsafe() != agent:
		error("wrong!")
	return db.get(person).enroll(pod)

def manage(agent, membership, identifier):
	memship = db.get(membership)
	pod = db.get(memship.pod)
	if pod.agent.urlsafe() != (agent or global_pod().agent.urlsafe()):
		error("wrong!")
	con = Content.query(Content.membership == membership,
		Content.identifier == identifier).get()
	if not con:
		con = Content(identifier=identifier, membership=membership)
		con.put()
	return con

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
		if not self.verified():
			return False
		self.passed = True
		self.put()
		return True

	def unverify(self):
		log("unverifying %s"%(self.key.urlsafe(),))
		sigs = Verification.query(Verification.act == self.key).fetch()
		log("unsigning %s verifications"%(len(sigs),), 1)
		db.delete_multi(sigs)
		log("unpassing", 1)
		self.passed = False
		self.put()

	def verify(self, person):
		if person in self.signers():
			log("verification (%s %s) success"%(self.key, person))
			Verification(act=self.key, person=person).put()
			return self.fulfill()
		log("verification attempt (%s %s) failed -- unauthorized"%(self.key, person))

	def verified(self):
		for person in self.signers():
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
	log("payday!", important=True)
	commz = Commitment.query(Commitment.passed == True).fetch()
	log("found %s live commitments"%(len(commz),), important=True)
	for comm in commz:
		comm.deposit()
	log("compensated pods and members corresponding to %s commitments"%(len(commz),), important=True)
	cbz = Codebase.query().fetch()
	log("found %s registered codebases"%(len(cbz),), important=True)
	for cb in cbz:
		cb.refresh()
	log("refreshed %s codebases"%(len(cbz),), important=True)

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