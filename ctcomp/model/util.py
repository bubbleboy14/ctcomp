from datetime import datetime, timedelta
from cantools import db, config
from cantools.util import error, log
from cantools.web import send_mail
from ctcoop.model import Stewardship
from compTemplates import SERVICE, APPOINTMENT, REMINDER, DELIVERED
from .core import Pod, Membership, Content
from .coders import Codebase, Contributor, Contribution
from .ledger import Audit, PayBatch
from .resources import Resource
from .verifiables import Appointment, Delivery, Commitment, Act

ratios = config.ctcomp.ratios

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

def membership(person, pod):
	return Membership.query(Membership.pod == pod.key,
		Membership.person == person.key).get()

def enroll(agent, pkey, person):
	pod = db.get(pkey)
	if pod.agent.urlsafe() != agent:
		error("wrong!")
	return db.get(person).enroll(pod)

def manage(agent, membership, identifier, memberships=None):
	memship = db.get(membership or memberships[0])
	pod = db.get(memship.pod)
	if pod.agent.urlsafe() != (agent or global_pod().agent.urlsafe()):
		error("wrong!")
	conq = Content.query(Content.identifier == identifier)
	if memberships:
		conq.filter(Content.memberships == memberships)
	else:
		conq.filter(Content.membership == membership)
	con = conq.get()
	if not con:
		con = Content(identifier=identifier)
		if memberships:
			con.memberships = memberships
		else:
			con.membership = membership
		con.put()
	return con

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

def getContribution(codebase, handle):
	butor = Contributor.query(Contributor.handle == handle).get()
	if butor:
		bution = Contribution.query(Contribution.codebase == codebase.key,
			Contribution.contributor == butor.key).get()
		if not bution:
			bution = Contribution(codebase=codebase.key, contributor=butor.key)
			bution.put()
		return bution

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

def audit(variety="ledger"): # ledger|deed
	log("audit (%s)!"%(variety,), important=True)
	getattr(Audit(), variety)()