from datetime import datetime, timedelta
from cantools import db, config
from cantools.util import error
from cantools.web import email_admins, fetch, log, send_mail
from ctcoop.model import *
from ctdecide.model import Proposal
from ctstore.model import Product
from compTemplates import MEET, PAID, APPOINTMENT
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

	def deposit(self, amount):
		self.outstanding += amount
		self.put()

class Contributor(db.TimeStampedBase):
	handle = db.String()

def membership(person, pod):
	return Membership.query(Membership.pod == pod.key,
		Membership.person == person.key).get()

class Person(Member):
	ip = db.String()                              # optional
	wallet = db.ForeignKey(kind=Wallet)           # optional
	contributor = db.ForeignKey(kind=Contributor) # optional
	chat = db.Boolean(default=True)

	def onjoin(self):
		email_admins("New Person", self.email)
		self.enroll(global_pod())
		wallet = Wallet()
		wallet.put()
		self.wallet = wallet.key
		self.put()

	def enroll(self, pod):
		memship = membership(self, pod)
		if not memship:
			memship = Membership(pod=pod.key, person=self.key)
			memship.put()
		return memship.key

	def tasks(self):
		return db.get_multi(sum([p.tasks for p in self.pods()], []))

	def pods(self):
		return db.get_multi([m.pod for m in self.memberships()])

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
	blurb = db.Text()
	pool = db.ForeignKey(kind=Wallet)
	agent = db.ForeignKey(kind="Pod")
	tasks = db.ForeignKey(kind=Task, repeated=True)
	includers = db.ForeignKey(kind=Person, repeated=True)
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

	def expenses(self):
		return self._collection(Expense)

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

	def deposit(self, member, amount, nocode=False, pay=False):
		memwall = member.wallet.get()
		if pay:
			memcut = amount * ratios.pay
			amount -= memcut
			memwall.deposit(memcut)
		else:
			memwall.deposit(amount)
		self.pool.get().deposit(amount)
		self.agent and self.agent.get().pool.get().deposit(amount * ratios.agent)
		if not nocode:
			for codebase in self.codebases():
				codebase.deposit(amount)
			depcut = amount * ratios.code.dependency
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

def blogger_pod():
	p = Pod.query(Pod.name == "bloggers", Pod.variety == "managed").get()
	if not p:
		p = Pod()
		p.name = "bloggers"
		p.variety = "managed"
		p.agent = global_pod().agent
		p.oncreate()
		p.put()
	return p

class Membership(db.TimeStampedBase):
	pod = db.ForeignKey(kind=Pod)
	person = db.ForeignKey(kind=Person)
	proposals = db.ForeignKey(kind=Proposal, repeated=True)
	products = db.ForeignKey(kind=Product, repeated=True)

	def deposit(self, amount, nocode=False, pay=False):
		self.pod.get().deposit(self.person.get(), amount, nocode, pay)

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

	def notify(self, subject, body):
		for signer in self.signers():
			send_mail(to=signer.get().email, subject=subject, body=body(signer))

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
			if Verification.query(Verification.act == self.key, Verification.person == person).get():
				return log("already verified (%s %s)!"%(self.key, person), important=True)
			log("verification (%s %s) success"%(self.key, person))
			Verification(act=self.key, person=person).put()
			return self.fulfill()
		log("verification attempt (%s %s) failed -- unauthorized"%(self.key, person))

	def verified(self):
		for person in self.signers():
			if not Verification.query(Verification.act == self.key, Verification.person == person).get():
				return False
		return True

class Appointment(Verifiable):
	timeslot = db.ForeignKey(kind=Timeslot)

	def signers(self):
		return self.task().editors

	def task(self):
		return self.stewardship().task()

	def stewardship(self):
		return self.timeslot.get().slotter()

	def fulfill(self):
		if not self.verified():
			return False
		self.membership.get().deposit(self.timeslot.get().duration)
		self.passed = True
		self.put()
		return True

def appointment(slot, task, pod, person):
	app = Appointment()
	app.membership = membership(person, pod).key
	app.notes = "\n\n".join([
		task.name, task.description,
		"time: " + slot.when.isoformat()[:5],
		"duration: %s hours"%(slot.duration,)
	])
	app.timeslot = slot.key
	app.put()
	app.notify("confirm appointment",
		lambda signer : APPOINTMENT%(person.email,
			pod.name, task.name, app.notes,
			app.key.urlsafe(), signer.urlsafe()))

class Payment(Verifiable):
	payer = db.ForeignKey(kind=Person)
	amount = db.Float()

	def signers(self):
		return [self.payer]

	def fulfill(self):
		if self.passed or not self.verified():
			return False
		payer = self.payer.get()
		memship = self.membership.get()
		recip = memship.person.get()
		pod = memship.pod.get()
		paywall = payer.wallet.get()
		paywall.outstanding -= self.amount
		memship.deposit(self.amount, pay=True)
		self.passed = True
		paywall.put()
		self.put()
		body = PAID%(self.amount, payer.email, recip.email, pod.name, self.notes)
		for target in [payer, recip]:
			send_mail(to=target.email, subject="payment confirmation", body=body)
		return True

class Expense(Verifiable):
	executor = db.ForeignKey(kind=Person) # reimbursement only
	variety = db.String(choices=["dividend", "reimbursement"])
	amount = db.Float(default=0.1) # for dividend, split amount * total
	recurring = db.Boolean(default=False)

	def dividend(self):
		pod = self.pod()
		pool = pod.pool.get()
		people = db.get_multi(pod.members())
		div = self.amount * pool.outstanding
		cut = div / len(people)
		for person in people:
			person.wallet.get().deposit(cut)
		pool.outstanding -= div
		pool.put()

	# reimbursement requires $$ conversion...
	def reimbursement(self):
		pass

	def fulfill(self):
		if (self.passed and not self.recurring) or not self.verified():
			return False
		getattr(self, self.variety)()
		return True

class Commitment(Verifiable):
	service = db.ForeignKey(kind=Service)
	estimate = db.Float(default=1.0) # per week (hours?)

	def deposit(self, numdays=1):
		service = self.service.get()
		log("compensating commitment: %s service (%s); estimated %s hours per week; paying for %s days"%(service.name,
			service.compensation, self.estimate, numdays))
		self.membership.get().deposit(service.compensation * self.estimate * numdays / 7.0)

def isToday(slot):
	now = datetime.now()
	if slot.schedule == "daily":
		return True
	elif slot.schedule == "weekly":
		return slot.when.weekday() == now.weekday()
	elif slot.schedule == "once":
		return slot.when.date() == now.date()
	elif slot.schedule == "exception":
		pass # TODO: exceptions!!!!

def task2pod(task):
	return Pod.query(Pod.tasks.contains(task.key.urlsafe())).get()

def payCal():
	log("paycal!", important=True)
	for stew in Stewardship.query().all():
		task = None
		pod = None
		person = None
		for slot in db.get_multi(stew.timeslots):
			if isToday(slot):
				if not task:
					task = stew.task()
					pod = task2pod(task)
					person = db.get(stew.steward)
				log("task: %s (%s)"%(task.name, task.mode))
				if task.mode == "automatic":
					pod.deposit(person, slot.duration)
				elif task.mode == "email confirmation":
					appointment(slot, task, pod, person)

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
	payCal()

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
	change = db.String(choices=["include", "exclude", "conversation"])
	person = db.ForeignKey(kind=Person) # person in question!

	def signers(self):
		pod = self.pod()
		if self.change == "conversation":
			pz = [p for p in pod.members()]
			self.person and pz.append(self.person)
			return pz
		elif self.change == "include" and pod.includers:
			return pod.includers
		return [p for p in pod.members() if p != self.person]

	def fulfill(self):
		if self.passed or not self.verified():
			return False
		pod = self.pod(True)
		if self.change == "exclude":
			Membership.query(Membership.pod == pod, Membership.person == self.person).rm()
		elif self.change == "include":
			Membership(pod=pod, person=self.person).put()
		elif self.change == "blurb":
			pod.blurb = self.notes
			pod.put()
		else: # conversation
			body = MEET%(self.pod().name, self.notes, self.key.urlsafe())
			self.notify("meeting scheduled", lambda signer : body)
		self.passed = True
		self.put()
		return True

class Verification(db.TimeStampedBase):
	act = db.ForeignKey(kinds=[Act, Request, Commitment])
	person = db.ForeignKey(kind=Person)