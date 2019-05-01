from cantools.web import respond, succeed, fail, cgi_get, local
from model import db, Person, Content, View, Act

def response():
	action = cgi_get("action", choices=["view", "act", "verify"])
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
		membership.pod.get().deposit(membership.person.get(), 1)

		succeed(view.key.urlsafe())
	elif action == "act":
		act = Act()
		act.service = cgi_get("service")
		act.pod = cgi_get("pod")
		act.workers = cgi_get("workers")
		act.beneficiaries = cgi_get("beneficiaries")
		act.notes = cgi_get("notes")
		act.put()
		succeed(act.key.urlsafe())
	elif action == "verify":
		act = db.get(cgi_get("act"))
		act.verify(cgi_get("person"))
	else:
		fail("what? bad action: %s"%(action,))

respond(response)