from cantools.web import respond, succeed, fail, cgi_get, local
from model import db, CTUser, Content, View

def response():
	action = cgi_get("action", choices=["view"])
	if action == "view":
		ip = local("response").ip
		content = db.get(cgi_get("content")) # key

		user = cgi_get("user", required=False) # key
		if user:
			user = db.get(user)
		else:
			user = CTUser.query(CTUser.blurb == ip).get() # haha
		if not user:
			user = CTUser()
			user.blurb = ip # haha again
			user.put()

		if View.query(View.viewer == user.key, View.content == content.key).get():
			succeed("already viewed")
		view = View()
		view.viewer = user.key
		view.content = content.key
		view.put()

		# TODO: create a token!! put it in the right account! <---

		succeed(view.key.urlsafe())
	else:
		fail("what? bad action: %s"%(action,))

respond(response)