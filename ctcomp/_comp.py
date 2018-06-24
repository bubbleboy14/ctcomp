from cantools.web import respond, succeed, fail, cgi_get, local
from model import db, Person, Content, View

def response():
	action = cgi_get("action", choices=["view"])
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

		owner = content.owner.get()
		wallet = owner.wallet.get()
		wallet.deposit(1)

		succeed(view.key.urlsafe())
	else:
		fail("what? bad action: %s"%(action,))

respond(response)