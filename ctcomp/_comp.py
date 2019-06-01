from cantools.web import respond, succeed, fail, cgi_get, log, local, send_mail, redirect
from model import db, enroll, manage, Person, Content, View, Act, Commitment, Request
from compTemplates import APPLY, APPLICATION, EXCLUDE, SERVICE, COMMITMENT, CONFCODE
from cantools import config

def view(user, content):
	if View.query(View.viewer == user.key, View.content == content.key).get():
		return log("already viewed (user %s; content %s)"%(user.key.urlsafe(), content.key.urlsafe()))
	view = View()
	view.viewer = user.key
	view.content = content.key
	view.put()
	membership = content.membership.get()
	membership.pod.get().deposit(membership.person.get(), config.ctcomp.ratios.view)

def views(user):
	contents = cgi_get("content")
	agent = cgi_get("agent", required=False)
	if type(contents) is not list:
		contents = [contents]
	for content in contents:
		view(user, cont(content, agent))

def cont(content, agent):
	return isinstance(content, basestring) and db.get(content) or manage(agent,
		content["membership"], content["identifier"])

def response():
	action = cgi_get("action", choices=["view", "service", "commitment", "request", "verify", "unverify", "apply", "pod", "membership", "person", "enroll", "manage", "confcode"])
	if action == "view":
		ip = local("response").ip
		user = cgi_get("user", required=False) # key
		if user:
			user = db.get(user)
		else:
			user = Person.query(Person.ip == ip).get()
		if not user:
			user = Person()
			user.ip = ip
			user.put()
		views(user)
	elif action == "service":
		act = Act()
		act.membership = cgi_get("membership")
		act.service = cgi_get("service")
		act.workers = cgi_get("workers")
		act.beneficiaries = cgi_get("beneficiaries")
		act.notes = cgi_get("notes")
		act.put()
		akey = act.key.urlsafe()
		service = act.service.get()
		memship = act.membership.get()
		person = memship.person.get()
		pod = memship.pod.get()
		workers = "\n".join([w.email for w in db.get_multi(act.workers)])
		for signer in act.beneficiaries:
			send_mail(to=signer.get().email, subject="verify service",
				body=SERVICE%(person.email, pod.name, service.name, workers, akey, signer.urlsafe()))
		succeed(akey)
	elif action == "commitment":
		comm = Commitment()
		comm.membership = cgi_get("membership")
		comm.service = cgi_get("service")
		comm.estimate = cgi_get("estimate")
		comm.notes = cgi_get("notes")
		comm.put()
		comm.verify(comm.membership.get().person) # (submitter already agrees)
		ckey = comm.key.urlsafe()
		service = comm.service.get()
		memship = comm.membership.get()
		person = memship.person.get()
		pod = memship.pod.get()
		for signer in pod.members():
			send_mail(to=signer.get().email, subject="affirm commitment",
				body=COMMITMENT%(person.email, pod.name, comm.estimate,
					service.name, ckey, signer.urlsafe()))
		succeed(ckey)
	elif action == "request":
		req = Request()
		req.membership = cgi_get("membership")
		req.change = cgi_get("change")
		req.person = cgi_get("person")
		req.notes = cgi_get("notes")
		req.put()
		rpmail = req.person.get().email
		memship = req.membership.get()
		mpmail = memship.person.get().email
		pod = memship.pod.get()
		rkey = req.key.urlsafe()
		if req.change == "include":
			send_mail(to=rpmail, subject="pod membership nomination",
				body=APPLY%(mpmail, pod.name, rkey))
		else: # exclude
			for mem in req.signers():
				send_mail(to=mem.get().email, subject="pod membership exclusion proposal",
					body=EXCLUDE%(mpmail, rpmail, pod.name, rkey, mem.urlsafe()))
		succeed(req.key.urlsafe())
	elif action == "verify":
		verifiable = db.get(cgi_get("verifiable")) # act or request or commitment
		verifiable.verify(db.KeyWrapper(cgi_get("person")))
		redirect("/comp/pods.html", "you did it!")
	elif action == "unverify": # commitment only!!!!??!
		vkey = cgi_get("verifiable")
		verifiable = db.get(vkey)
		verifiable.unverify()
		service = verifiable.service.get()
		memship = verifiable.membership.get()
		person = memship.person.get()
		pod = memship.pod.get()
		for signer in pod.members():
			send_mail(to=signer.get().email, subject="affirm commitment - estimate adjustment",
				body=COMMITMENT%(person.email, pod.name, verifiable.estimate,
					service.name, vkey, signer.urlsafe()))
	elif action == "apply":
		req = db.get(cgi_get("request"))
		memship = req.membership.get()
		pod = memship.pod.get()
		em = req.person.get().email
		rkey = req.key.urlsafe()
		for mem in pod.members():
			send_mail(to=mem.get().email, subject="pod membership application",
				body=APPLICATION%(em, pod.name, rkey, mem.urlsafe()))
		redirect("/comp/pods.html", "you did it!")
	elif action == "pod":
		pod = db.get(cgi_get("pod"))
		succeed({
			"services": [a.data() for a in pod.acts()],
			"requests": [r.data() for r in pod.requests()],
			"proposals": [p.data() for p in db.get_multi(pod.proposals())],
			"commitments": [c.data() for c in pod.commitments()],
			"memberships": [m.data() for m in pod.members(True)],
			"people": [p.data() for p in db.get_multi(pod.members())],
			"codebases": [c.data() for c in pod.codebases()]
		})
	elif action == "membership":
		succeed({
			"content": [c.data() for c in Content.query(Content.membership == cgi_get("membership")).fetch()]
		})
	elif action == "person":
		person = db.get(cgi_get("person"))
		succeed({
			"services": len(person.acts()), # more efficient way?
			"memberships": [m.data() for m in person.memberships()],
			"commitments": sum([c.estimate for c in person.commitments()])
		})
	elif action == "enroll":
		succeed(enroll(cgi_get("agent"), cgi_get("pod"), cgi_get("person")).urlsafe())
	elif action == "manage":
		succeed(manage(cgi_get("agent"), cgi_get("membership"), cgi_get("content")).key.urlsafe())
	elif action == "confcode":
		send_mail(to=cgi_get("email"), subject="carecoin confirmation code",
			body=CONFCODE%(cgi_get("code"),))

respond(response)