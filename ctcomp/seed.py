from model import db, global_pod, Person, Pod, Service
from cantools import config

def person(email, pw, pod=None):
	p = Person()
	p.firstName = min(email.split(".")[0], email.split("@")[0])
	p.email = email
	p.active = True
	p.put()
	p.password = db.hashpass(pw, p.created)
	p.onjoin()
	pod and p.enroll(pod)
	return p

def services(serz):
	sz = []
	for variety, examples in serz.items():
		for example in examples:
			sz.append(Service(name=example, variety=variety))
	db.put_multi(sz)

def agent():
	gpod = global_pod()
	apod = Pod(name="carecoin")
	apod.variety = "software"
	apod.oncreate()
	apod.put()
	gpod.agent = apod.key
	gpod.put()
	return apod

def seed(serz, pw):
	cc = agent()
	services(serz)
	for admin in config.admin.contacts:
		person(admin, pw, cc)