from datetime import datetime, timedelta
from cantools import db, config
from cantools.util import log
from cantools.web import email_admins, send_mail
from ctcoop.model import Conversation, Member, Tag, Need, Offering, Update, Task
from ctdecide.model import Proposal
from ctstore.model import Product
from compTemplates import ADJUSTMENT, ADJUSTED, INVITATION, FEEDBACK, NEED, OFFERING
from .coders import Codebase, Contributor
from .ledger import Wallet
from .resources import Board, Book, Web, Media, Organization, Resource
from .verifiables import Act, Appointment, Commitment, Delivery, Expense, Request

ratios = config.ctcomp.ratios

class Person(Member):
	ip = db.String()                              # optional
	wallet = db.ForeignKey(kind=Wallet)           # optional
	interests = db.ForeignKey(kind=Tag, repeated=True)
	contributors = db.ForeignKey(kind=Contributor, repeated=True)
	chat = db.Boolean(default=True)
	remind = db.Boolean(default=True)

	def onjoin(self):
		from .util import global_pod
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
		from .util import membership, reg_act
		which = item.polytype
		isneed = which == "need"
		pod = Pod.query(getattr(Pod, which + "s").contains(item.key.urlsafe())).get()
		reg_act(membership(self, pod).key, pod.support_service(),
			[isneed and self.key or item.member], [isneed and item.member or self.key],
			item.description)

	def enroll(self, pod):
		from .util import membership
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
	needs = db.ForeignKey(kind=Need, repeated=True)
	tasks = db.ForeignKey(kind=Task, repeated=True)
	boards = db.ForeignKey(kind=Board, repeated=True)
	updates = db.ForeignKey(kind=Update, repeated=True)
	drivers = db.ForeignKey(kind=Person, repeated=True)
	includers = db.ForeignKey(kind=Person, repeated=True)
	resources = db.ForeignKey(kind=Resource, repeated=True)
	offerings = db.ForeignKey(kind=Offering, repeated=True)
	dependencies = db.ForeignKey(kind=Codebase, repeated=True) # software
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
	interaction = db.ForeignKey(kinds=[Appointment, Delivery, Request])
	answers = db.ForeignKey(kind=Answer, repeated=True)
	topic = db.String()
	notes = db.Text()
	followup = db.Boolean(default=False)

	def membership(self):
		from .util import membership
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

class Content(db.TimeStampedBase):
	membership = db.ForeignKey(kind=Membership)
	identifier = db.String() # some hash, defaulting to url

class View(db.TimeStampedBase):
	viewer = db.ForeignKey(kind=Person)
	content = db.ForeignKey(kind=Content)

	def total(self):
		return ratios.view

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