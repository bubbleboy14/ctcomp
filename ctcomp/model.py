from datetime import datetime, timedelta
from six import string_types
from cantools import db, config
from cantools.util import error, log
from cantools.web import email_admins, fetch, send_mail
from cantools.geo import address2latlng
from ctcoop.model import *
from ctdecide.model import Proposal
from ctstore.model import Product
from ctmap.model import getzip, Place
from compTemplates import MEET, PAID, SERVICE, ADJUSTMENT, ADJUSTED, APPOINTMENT, INVITATION, REMINDER, APPLY, EXCLUDE, BLURB, CONVO, DELIVERY, DELIVERED, FEEDBACK, BOARD, RESOURCE, LIBITEM, NEED, OFFERING
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

class Contributor(db.TimeStampedBase):
	handle = db.String()

def membership(person, pod):
	return Membership.query(Membership.pod == pod.key,
		Membership.person == person.key).get()

class Person(Member):
	ip = db.String()                              # optional
	wallet = db.ForeignKey(kind=Wallet)           # optional
	interests = db.ForeignKey(kind=Tag, repeated=True)
	contributors = db.ForeignKey(kind=Contributor, repeated=True)
	chat = db.Boolean(default=True)
	remind = db.Boolean(default=True)

	def onjoin(self):
		email_admins("New Person", self.email)
		self.enroll(global_pod())
		wallet = Wallet()
		wallet.put()
		self.wallet = wallet.key
		self.put()
		self.process_invites()

	def process_invites(self):
		log("processing invitations for %s"%(self.email,))
		podz = set()
		for invitation in Invitation.query(Invitation.email == self.email).fetch():
			imem = invitation.membership.get()
			ipod = imem.pod.get().name
			memem = imem.person.get().email
			log("pod: %s. inviter: %s"%(ipod, memem), 1)
			if ipod in podz:
				log("skipping invitation -- already invited to pod", 2)
			else:
				log("sending invitation", 2)
				podz.add(ipod)
				invitation.send(self)

	def help_match(self, item): # overrides Member.help_match() in ctcoop.model
		which = item.polytype
		isneed = which == "need"
		pod = Pod.query(getattr(Pod, which + "s").contains(item.key.urlsafe())).get()
		reg_act(membership(self, pod).key, pod.support_service(),
			[isneed and self.key or item.member], [isneed and item.member or self.key],
			item.description)

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

class Resource(Place):
	editors = db.ForeignKey(kind=Person, repeated=True)
	name = db.String()
	description = db.Text()
	tags = db.ForeignKey(kind=Tag, repeated=True)
	icon = db.String() # refers to ctmap graphic resource
	label = "name"

	def _pre_trans_zipcode(self, val):
		if isinstance(val, string_types) and len(val) < 10:
			val = getzip(val).key
		return val

	def oncreate(self):
		zcode = self.zipcode.get()
		addr = "%s, %s, %s"%(self.address, zcode.city, zcode.state)
		self.latitude, self.longitude = address2latlng(addr)

	def notify(self, podname, interested):
		bod = RESOURCE%(podname, self.name, self.description)
		for person in interested:
			send_mail(to=person.email, subject="new message board", body=bod)

class LibItem(db.TimeStampedBase):
	content = db.ForeignKey(kind="Content")
	editors = db.ForeignKey(kind=Person, repeated=True)
	name = db.String()
	description = db.Text()
	tags = db.ForeignKey(kind=Tag, repeated=True)
	label = "name"

	def notify(self, podname, interested):
		bod = LIBITEM%(podname, self.name, self.description)
		for person in interested:
			send_mail(to=person.email, subject="new message board", body=bod)

class Organization(LibItem):
	url = db.String()
	phone = db.String()

class Book(LibItem):
	author = db.String()
	read = db.String()
	buy = db.String()

class Web(LibItem):
	url = db.String()
	kind = db.String(choices=["site", "article", "video", "podcast", "pdf"])

class Media(LibItem):
	item = db.Binary()
	kind = db.String(choices=["img", "video", "audio", "pdf"])

class Board(db.TimeStampedBase):
	name = db.String()
	description = db.Text()
	anonymous = db.Boolean(default=False)
	tags = db.ForeignKey(kind=Tag, repeated=True)
	conversation = db.ForeignKey(kind=Conversation)
	label = "name"

	def pod(self):
		return Pod.query(Pod.boards.contains(self.key.urlsafe())).get()

	def notify(self, podname, interested):
		bod = BOARD%(podname, self.name, self.description)
		for person in interested:
			send_mail(to=person.email, subject="new message board", body=bod)

	def oncreate(self):
		convo = Conversation(topic=self.name)
		convo.anonymous = self.anonymous
		convo.put()
		self.conversation = convo.key

class Pod(db.TimeStampedBase):
	name = db.String()
	variety = db.String()
	blurb = db.Text()
	pool = db.ForeignKey(kind=Wallet)
	agent = db.ForeignKey(kind="Pod")
	needs = db.ForeignKey(kind=Need, repeated=True)
	tasks = db.ForeignKey(kind=Task, repeated=True)
	boards = db.ForeignKey(kind=Board, repeated=True)
	updates = db.ForeignKey(kind=Update, repeated=True)
	drivers = db.ForeignKey(kind=Person, repeated=True)
	includers = db.ForeignKey(kind=Person, repeated=True)
	resources = db.ForeignKey(kind=Resource, repeated=True)
	offerings = db.ForeignKey(kind=Offering, repeated=True)
	dependencies = db.ForeignKey(kind="Codebase", repeated=True) # software
	library = db.ForeignKey(kinds=[Organization, Book, Web, Media], repeated=True) # support

	def _trans_boards(self, val):
		v = val[-1].get()
		v.notify(self.name, self.interested(v.tags))
		return val;

	def _trans_library(self, val):
		v = val[-1].get()
		v.notify(self.name, self.interested(v.tags))
		return val;

	def _trans_resources(self, val):
		v = val[-1].get()
		v.notify(self.name, self.interested(v.tags))
		return val;

	def _trans_needs(self, val):
		self.notify(val[-1].get(), NEED)
		return val;

	def _trans_offerings(self, val):
		self.notify(val[-1].get(), OFFERING)
		return val;

	def notify(self, item, etemp):
		bod = etemp%(self.name, item.description)
		for person in self.interested(item.tags):
			send_mail(to=person.email,
				subject="new %s"%(item.polytype,), body=bod)

	def interested(self, tags):
		tagz = set(map(lambda t : t.urlsafe(), tags))
		return filter(lambda p : tagz.intersection(set(map(lambda t : t.urlsafe(),
			p.interests))), db.get_multi(self.members()))

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

	def deposit(self, member, amount, deed, note, details=None, nocode=False, pay=False):
		memwall = member.wallet.get()
		if pay:
			memcut = amount * ratios.pay
			amount -= memcut
			memwall.deposit(memcut, self, deed, note, details)
		else:
			memwall.deposit(amount, self, deed, note, details)
		self.pool.get().deposit(amount, self, deed, note, details)
		self.agent and self.agent.get().pool.get().deposit(amount * ratios.agent,
			self, deed, note, details)
		if not nocode:
			for codebase in self.codebases():
				codebase.deposit(amount, deed)
			depcut = amount * ratios.code.dependency
			for dependency in db.get_multi(self.dependencies):
				dependency.deposit(depcut, deed)

	def service(self, member, service, recipient_count, details):
		self.deposit(member, service.compensation * recipient_count, service,
			"service: %s (%s)"%(service.name, service.variety), details)

	def support_service(self):
		sname = (self.variety == "support") and self.name or "support"
		service = Service.query(Service.name == sname,
			Service.variety == self.variety).get()
		if not service:
			service = Service(name=sname, variety=self.variety)
			service.put()
		return service.key

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

	def deposit(self, amount, deed, note, details=None, nocode=False, pay=False):
		self.pod.get().deposit(self.person.get(), amount, deed, note, details, nocode, pay)

class Invitation(db.TimeStampedBase):
	membership = db.ForeignKey(kind=Membership)
	email = db.String()
	notes = db.Text()

	def invite(self):
		memship = self.membership.get()
		send_mail(to=self.email, subject="invitation",
			body=INVITATION%(memship.person.get().email, memship.pod.get().name))

	def send(self, person):
		req = Request()
		req.membership = self.membership
		req.person = person.key
		req.change = "include"
		req.notes = self.notes
		req.put()
		req.remind()

class Answer(db.TimeStampedBase):
	prompt = db.String()
	response = db.Text()
	rating = db.Integer() # 1-5

	def full(self):
		return "\n".join([
			self.prompt,
			self.response,
			str(self.rating)
		])

class Feedback(db.TimeStampedBase):
	person = db.ForeignKey(kind=Person)
	conversation = db.ForeignKey(kind=Conversation)
	interaction = db.ForeignKey(kinds=["appointment", "delivery", "request"])
	answers = db.ForeignKey(kind=Answer, repeated=True)
	topic = db.String()
	notes = db.Text()
	followup = db.Boolean(default=False)

	def membership(self):
		return membership(self.person.get(), self.pod())

	def pod(self):
		return self.interaction.get().pod()

	def full(self):
		answers = "\n\n".join([a.full() for a in db.get_multi(self.answers)])
		return "\n\n".join([
			self.topic,
			answers,
			self.notes,
			"request follow up: %s"%(self.followup,)
		])

	def notify(self):
		bod = FEEDBACK%(self.person.get().firstName, self.pod().name,
			self.full(), self.key.urlsafe())
		self.interaction.get().notify("feedback",
			lambda signer : bod, self.participants())

	def participants(self):
		pars = self.interaction.get().signers()
		if self.person not in pars:
			return pars + [self.person]
		return pars

	def oncreate(self):
		convo = Conversation(topic=self.topic)
		convo.participants = self.participants()
		convo.put()
		self.conversation = convo.key
		self.put() # for notify() key
		self.notify()
		if self.followup:
			req = Request()
			req.membership = self.membership().key
			req.change = "conversation"
			req.notes = self.notes
			req.put()
			req.remind()

class Codebase(db.TimeStampedBase):
	pod = db.ForeignKey(kind=Pod)
	owner = db.String() # bubbleboy14
	repo = db.String()  # ctcomp
	variety = db.String(choices=["platform", "framework", "service", "research and development"])
	dependencies = db.ForeignKey(kind="Codebase", repeated=True)
	label = "repo"

	def deposit(self, amount, deed):
		log('compensating "%s/%s" codebase: %s'%(self.owner, self.repo, amount))
		contz = self.contributions()
		total = float(sum([cont.count for cont in contz]))
		platcut = amount * ratios.code.get(self.variety, ratios.code.rnd)
		log('dividing %s cut (%s) among %s contributors'%(self.variety, platcut, len(contz)))
		details = "variety: %s\nowner: %s"%(self.variety, self.owner)
		for contrib in contz:
			memship = contrib.membership()
			memship and memship.deposit(platcut * contrib.count / total, deed,
				"code usage: %s@%s"%(contrib.handle(), self.repo), details, True)
		depcut = amount * ratios.code.dependency
		dnum = len(self.dependencies)
		if dnum:
			depshare = depcut / dnum
			log('dividing dependency cut (%s) among %s codebases'%(depcut, dnum))
			for dep in db.get_multi(self.dependencies):
				dep.deposit(depshare, deed)

	def contributions(self, asmap=False):
		clist = Contribution.query(Contribution.codebase == self.key).fetch()
		if not asmap:
			return clist
		contz = {}
		for cont in clist:
			contz[cont.contributor.get().handle] = cont
		return contz

	def refresh(self, cbatch):
		freshies = fetch("api.github.com", "/repos/%s/%s/contributors"%(self.owner,
			self.repo), asjson=True, protocol="https")
		pcount = 0
		ccount = 0
		for item in freshies:
			log("checking for: %s"%(item["login"],), 1)
			contrib = getContribution(self, item["login"])
			if contrib:
				pcount += 1
				ccount += contrib.refresh(item["contributions"], cbatch)
		return "%s/%s: %s contributors, %s contributions"%(self.owner, self.repo, pcount, ccount)

class Contribution(db.TimeStampedBase):
	codebase = db.ForeignKey(kind=Codebase)
	contributor = db.ForeignKey(kind=Contributor)
	count = db.Integer(default=0)

	def handle(self):
		return self.contributor.get().handle

	def membership(self):
		person = Person.query(Person.contributors.contains(self.contributor.urlsafe())).get()
		pod = db.get(self.codebase).pod
		return person and pod and Membership.query(Membership.pod == pod, Membership.person == person.key).get()

	def refresh(self, total, cbatch):
		diff = total - self.count
		if diff:
			cbase = self.codebase.get()
			self.membership().deposit(diff * ratios.code.line, cbatch,
				"code commits: %s@%s"%(self.handle(), cbase.repo),
				"variety: %s\nowner: %s\nbatch: %s\ntotal: %s"%(cbase.variety,
					cbase.owner, diff, total), True)
			self.count = total
			self.put()
		return diff

class PayBatch(db.TimeStampedBase):
	count = db.Integer(default=0)
	variety = db.String()
	details = db.Text()

def payCode():
	log("payCode!", important=True)
	cbz = Codebase.query().fetch()
	lcbz = len(cbz)
	cbatch = PayBatch(variety="code", count=lcbz)
	cbatch.put()
	log("found %s registered codebases"%(lcbz,), important=True)
	deetz = []
	for cb in cbz:
		cbline = cb.refresh(cbatch)
		log(cbline)
		deetz.append(cbline)
	cbatch.details = "\n".join(deetz)
	cbatch.put()
	log("refreshed %s codebases"%(lcbz,), important=True)

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

class Adjustment(Proposal):
	variety = db.String() # already has name!
	compensation = db.Float(default=1.0)

	def oncreate(self):
		convo = Conversation(topic=self.name)
		convo.put()
		self.conversation = convo.key
		service = self.service()
		self.notify("compensation adjustment proposed",
			lambda signer : ADJUSTMENT%(self.name,
				self.variety, service.compensation,
				self.compensation, self.description))

	def onpass(self):
		serv = self.service()
		self.notify("compensation adjustment approved",
			lambda signer : ADJUSTED%(self.name,
				self.variety, serv.compensation,
				self.compensation, self.description))
		serv.compensation = self.compensation
		serv.put()

	def notify(self, subject, body):
		for signer in self.voters():
			send_mail(to=signer.get().email, subject=subject, body=body(signer))

	def service(self):
		return Service.query(Service.name == self.name,
			Service.variety == self.variety).get()

	def voters(self):
		peeps = set()
		for pod in Pod.query(Pod.variety == self.variety).all():
			peeps.update([k.urlsafe() for k in pod.members()])
		return [db.KeyWrapper(p) for p in list(peeps)]

	def votership(self):
		return len(self.voters())

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

	def notify(self, subject, body, signers=None):
		for signer in (signers or self.signers()):
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
			log("verification (%s %s) success"%(self.key.urlsafe(), person.urlsafe()))
			Verification(act=self.key, person=person).put()
			return self.fulfill()
		log("verification attempt (%s %s) failed -- unauthorized"%(self.key, person))

	def veriquery(self):
		return Verification.query(Verification.act == self.key)

	def verified(self):
		for person in self.signers():
			if not self.veriquery().filter(Verification.person == person).get():
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
		self.membership.get().deposit(self.timeslot.get().duration,
			self, "appointment: %s"%(self.task().name,), self.notes)
		self.passed = True
		self.put()
		return True

def appointment(slot, task, pod, person):
	w = slot.when
	app = Appointment()
	app.membership = membership(person, pod).key
	app.notes = "\n\n".join([
		task.name, task.description,
		"time: %s:%s"%(w.hour, w.minute),
		"duration: %s hours"%(slot.duration,)
	])
	app.timeslot = slot.key
	app.put()
	akey = app.key.urlsafe()
	app.notify("confirm appointment",
		lambda signer : APPOINTMENT%(person.email,
			pod.name, task.name, app.notes,
			akey, signer.urlsafe(), akey))

class Delivery(Verifiable):
	driver = db.ForeignKey(kind=Person)
	miles = db.Integer()

	def signers(self):
		return [self.membership.get().person, self.driver]

	def fulfill(self):
		if self.passed or not self.verified():
			return False
		self.pod().deposit(self.driver.get(),
			ratios.delivery + ratios.mileage * self.miles, self,
			"delivery: %s miles"%(self.miles,), self.notes)
		self.passed = True
		self.put()
		return True

def delivery(memship, driver, notes):
	deliv = Delivery()
	deliv.membership = memship
	deliv.driver = driver
	deliv.notes = notes
	deliv.miles = int(notes.split(" ")[-1])
	deliv.put()
	dkey = deliv.key.urlsafe()
	driper = deliv.driver.get()
	memper = deliv.membership.get().person.get()
	deliv.notify("confirm delivery",
		lambda signer : DELIVERED%(driper.email,
			memper.email, deliv.notes,
			dkey, signer.urlsafe(), dkey))

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
		payer.wallet.get().debit(self.amount, pod, self,
			"payment to %s"%(recip.email,), self.notes)
		memship.deposit(self.amount, self, "payment from %s"%(payer.email,),
			self.notes, pay=True)
		self.passed = True
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
			person.wallet.get().deposit(cut, pod, self, "dividend")
		pool.debit(div, pod, self, "dividend")

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
		details = "compensating commitment: %s service (%s); estimated %s hours per week; paying for %s days"%(service.name,
			service.compensation, self.estimate, numdays)
		log(details)
		self.membership.get().deposit(service.compensation * self.estimate * numdays / 7.0,
			self, "commitment: %s"%(service.name,), details)

def task2pod(task):
	return Pod.query(Pod.tasks.contains(task.key.urlsafe())).get()

def remember(slot, task, pod, person, reminders):
	ukey = person.key.urlsafe()
	if ukey not in reminders:
		reminders[ukey] = []
	reminders[ukey].append("%s (%s pod) at %s"%(task.name,
		pod.name, slot.when.strftime("%H:%M")))

def remind(reminders):
	for pkey in reminders:
		send_mail(to=db.KeyWrapper(pkey).get().email, subject="commitment reminder",
			body=REMINDER%("\n".join(reminders[pkey]),))

def payCal():
	log("payCal!", important=True)
	today = datetime.now()
	tomorrow = today + timedelta(1)
	reminders = {}
	cbatch = PayBatch(variety="calendar")
	cbatch.put()
	deetz = []
	for stew in Stewardship.query().all():
		task = stew.task()
		pod = task2pod(task)
		person = db.get(stew.steward)
		slot = stew.happening(today)
		if slot:
			log("confirm: %s (%s)"%(task.name, task.mode))
			if task.mode == "automatic":
				cbatch.count += 1
				deetz.append("%s - %s hours"%(task.name, slot.duration))
				pod.deposit(person, slot.duration, cbatch,
					"task: %s"%(task.name,), task.description)
			elif task.mode == "email confirmation":
				appointment(slot, task, pod, person)
		if person.remind:
			slot = stew.happening(tomorrow)
			if slot:
				log("remind: %s (%s)"%(task.name, task.mode))
				remember(slot, task, pod, person, reminders)
	cbatch.details = "\n".join(deetz)
	cbatch.put()
	remind(reminders)

def payRes():
	log("payRes!", important=True)
	yesterday = datetime.now() - timedelta(1)
	for res in Resource.query(Resource.created > yesterday).all():
		pod = Pod.query(Pod.resources.contains(res.key.urlsafe())).get()
		person = res.editors[0].get()
		log("paying %s of '%s' pod for posting '%s' resource"%(person.firstName,
			pod.name, resource.name))
		pod.deposit(person, ratios.resource, resource,
			"resource: %s"%(resource.name,), resource.description)

def payComms():
	log("payComms!", important=True)
	commz = Commitment.query(Commitment.passed == True).fetch()
	log("found %s live commitments"%(len(commz),), important=True)
	for comm in commz:
		comm.deposit()
	log("compensated pods and members corresponding to %s commitments"%(len(commz),), important=True)

def payDay():
	log("payday!", important=True)
	payComms()
	payCode()
	payRes()
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
			pod.service(worker, service, count, self.notes)
		self.passed = True
		self.put()
		return True

def reg_act(membership, service, workers, beneficiaries, notes):
	act = Act()
	act.membership = membership
	act.service = service
	act.workers = workers
	act.beneficiaries = beneficiaries
	act.notes = notes
	act.put()
	akey = act.key.urlsafe()
	service = act.service.get()
	memship = act.membership.get()
	person = memship.person.get()
	pod = memship.pod.get()
	workers = "\n".join([w.email for w in db.get_multi(act.workers)])
	act.notify("verify service", lambda signer : SERVICE%(person.email,
		pod.name, service.name, act.notes, workers, akey,
		signer.urlsafe(), akey))
	return akey

class Request(Verifiable):
	change = db.String(choices=["include", "exclude",
		"conversation", "support", "delivery"])
	person = db.ForeignKey(kind=Person) # person in question!

	def remind(self):
		rpmail = self.person and self.person.get().email
		memship = self.membership.get()
		mpmail = memship.person.get().email
		pod = memship.pod.get()
		rkey = self.key.urlsafe()
		if self.change == "include":
			send_mail(to=rpmail, subject="pod membership nomination",
				body=APPLY%(mpmail, pod.name, rkey))
		elif self.change == "exclude":
			self.notify("pod membership exclusion proposal",
				lambda signer : EXCLUDE%(mpmail, rpmail, pod.name, rkey, signer.urlsafe()))
		elif self.change == "blurb":
			self.notify("pod blurb update proposal",
				lambda signer: BLURB%(mpmail, pod.name, self.notes, rkey, signer.urlsafe()))
		elif self.change == "delivery":
			self.notify("delivery request",
				lambda signer: DELIVERY%(mpmail, pod.name, self.notes, rkey, signer.urlsafe()),
				pod.drivers)
		else: # conversation / support
			self.notify("%s request"%(self.change,),
				lambda signer : CONVO%(mpmail, pod.name, self.notes, rkey, signer.urlsafe()))

	def signers(self):
		pod = self.pod()
		if self.change == "support":
			return [self.person, self.membership.get().person]
		elif self.change == "conversation":
			pz = [p for p in pod.members()]
			self.person and pz.append(self.person)
			return pz
		elif self.change == "include" and pod.includers:
			return pod.includers
		return [p for p in pod.members() if p != self.person]

	def verified(self):
		if self.change == "delivery":
			return bool(self.veriquery().get())
		return Verifiable.verified(self)

	def fulfill(self):
		if self.passed or not self.verified():
			return False
		pod = self.pod()
		if self.change == "exclude":
			Membership.query(Membership.pod == pod.key, Membership.person == self.person).rm()
		elif self.change == "include":
			Membership(pod=pod.key, person=self.person).put()
		elif self.change == "blurb":
			pod.blurb = self.notes
			pod.put()
		elif self.change == "delivery":
			delivery(self.membership, self.veriquery().get().person, self.notes)
		else: # conversation / support
			body = MEET%(pod.name, self.notes, self.key.urlsafe())
			self.notify("meeting scheduled", lambda signer : body)
			if pod.variety == "support":
				wb = self.signers()
				reg_act(self.membership, pod.support_service(), wb, wb, self.notes)
		self.passed = True
		self.put()
		return True

class Verification(db.TimeStampedBase):
	act = db.ForeignKey(kinds=[Act, Request, Commitment, Payment, Expense, Appointment, Delivery])
	person = db.ForeignKey(kind=Person)