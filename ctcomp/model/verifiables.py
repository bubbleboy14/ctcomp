from cantools import db, config
from cantools.util import log
from cantools.web import send_mail
from ctcoop.model import Timeslot
from compTemplates import MEET, PAID, APPLY, APPLICATION, EXCLUDE, BLURB, CONVO, DELIVERY

ratios = config.ctcomp.ratios

class Verifiable(db.TimeStampedBase):
	membership = db.ForeignKey(kind="Membership")
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
			if self.unverified(signer):
				send_mail(to=signer.get().email,
					subject=subject, body=body(signer))

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

	def unverified(self, person):
		return not self.veriquery().filter(Verification.person == person).get()

	def verified(self):
		for person in self.signers():
			if self.unverified(person):
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

class Delivery(Verifiable):
	driver = db.ForeignKey(kind="Person")
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

class Payment(Verifiable):
	payer = db.ForeignKey(kind="Person")
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
	executor = db.ForeignKey(kind="Person") # reimbursement only
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
	service = db.ForeignKey(kind="Service")
	estimate = db.Float(default=1.0) # per week (hours?)

	def deposit(self, numdays=1):
		service = self.service.get()
		details = "compensating commitment: %s service (%s); estimated %s hours per week; paying for %s days"%(service.name,
			service.compensation, self.estimate, numdays)
		log(details)
		self.membership.get().deposit(service.compensation * self.estimate * numdays / 7.0,
			self, "commitment: %s"%(service.name,), details)

class Act(Verifiable):
	service = db.ForeignKey(kind="Service")
	workers = db.ForeignKey(kind="Person", repeated=True)
	beneficiaries = db.ForeignKey(kind="Person", repeated=True)

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

class Request(Verifiable):
	change = db.String(choices=["include", "exclude",
		"conversation", "support", "blurb", "delivery"])
	person = db.ForeignKey(kind="Person") # person in question!

	def apply(self): # pingable
		memship = self.membership.get()
		pod = memship.pod.get()
		em = self.person.get().email
		rkey = self.key.urlsafe()
		self.notify("pod membership application",
			lambda signer: APPLICATION%(em,
				pod.name, rkey, signer.urlsafe()))

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
		from .core import Membership
		from .util import delivery, reg_act
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
	person = db.ForeignKey(kind="Person")