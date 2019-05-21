from cantools.web import respond, succeed, fail, cgi_get, local, send_mail
from model import db, Person, Content, View, Act, Commitment, Request
from compTemplates import APPLY, APPLICATION, EXCLUDE, SERVICE, COMMITMENT

def response():
	action = cgi_get("action", choices=["view", "service", "commitment", "request", "verify", "apply", "pod", "membership"])
	if action == "view":
		ip = local("response").ip
		content = db.get(cgi_get("content")) # key

		user = cgi_get("user", required=False) # key
		if user:
			user = db.get(user)
		else:
			user = Person.query(Person.ip == ip).get()
		if not user:
			user = Person()
			user.ip = ip
			user.put()

		if View.query(View.viewer == user.key, View.content == content.key).get():
			succeed("already viewed")
		view = View()
		view.viewer = user.key
		view.content = content.key
		view.put()

		membership = content.membership.get()
		membership.pod.get().deposit(membership.person.get(), 0.1)

		succeed(view.key.urlsafe())
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
		if req.action == "include":
			send_mail(to=rpmail, subject="pod membership nomination",
				body=APPLY%(mpmail, pod.name, rkey))
		else: # exclude
			for mem in req.signers():
				send_mail(to=mem.get().email, subject="pod membership exclusion proposal",
					body=EXCLUDE%(mpmail, rpmail, pod.name, rkey, mem.urlsafe()))
		succeed(req.key.urlsafe())
	elif action == "verify":
		verifiable = db.get(cgi_get("verifiable")) # act or request or commitment
		verifiable.verify(cgi_get("person"))
	elif action == "apply":
		req = db.get(cgi_get("request"))
		memship = req.membership.get()
		pod = memship.pod.get()
		em = req.person.get().email
		rkey = req.key.urlsafe()
		for mem in pod.members():
			send_mail(to=mem.get().email, subject="pod membership application",
				body=APPLICATION%(em, pod.name, rkey, mem.urlsafe()))
	elif action == "pod":
		pod = db.get(cgi_get("pod"))
		succeed({
			"services": [a.data() for a in pod.acts()],
			"requests": [r.data() for r in pod.requests()],
			"proposals": [p.data() for p in pod.proposals()],
			"commitments": [c.data() for c in pod.commitments()],
			"memberships": [m.data() for m in pod.members(True)],
			"people": [p.data() for p in db.get_multi(pod.members())]
		})
	elif action == "membership":
		succeed({ # maybe include com/ser/req/pro key lists too
			"content": [c.data() for c in Content.query(Content.membership == cgi_get("membership")).fetch()]
		})

respond(response)