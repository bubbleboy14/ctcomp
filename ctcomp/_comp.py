from cantools.web import respond, succeed, fail, cgi_get, local
from model import db, Person, Content, View, Act, Commitment, Request

def response():
	action = cgi_get("action", choices=["view", "act", "commit", "request", "verify", "proposals"])
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
	elif action == "act":
		act = Act()
		act.membership = cgi_get("membership")
		act.service = cgi_get("service")
		act.workers = cgi_get("workers")
		act.beneficiaries = cgi_get("beneficiaries")
		act.notes = cgi_get("notes")
		act.put()
		succeed(act.key.urlsafe())
	elif action == "commit":
		comm = Commitment()
		comm.membership = cgi_get("membership")
		comm.service = cgi_get("service")
		comm.estimate = cgi_get("estimate")
		comm.put()
		comm.verify(comm.membership.get().person) # (submitter already agrees)
		succeed(comm.key.urlsafe())
	elif action == "request":
		req = Request()
		req.action = cgi_get("action")
		req.person = cgi_get("person")
		req.pod = cgi_get("pod")
		req.notes = cgi_get("notes")
		req.put()
		succeed(req.key.urlsafe())
	elif action == "verify":
		verifiable = db.get(cgi_get("verifiable")) # act or request or commitment
		verifiable.verify(cgi_get("person"))
	elif action == "proposals":
		succeed(db.get(cgi_get("pod")).proposals())

respond(response)