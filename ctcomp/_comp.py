from cantools.web import respond, succeed, fail, cgi_get, local
from model import View

def response():
	action = cgi_get("action", choices=["view"])
	if action == "view":
		ip = local("response").ip
		content = cgi_get("content")
		if View.query(View.ip == ip, View.content == content).get():
			succeed("already viewed")
		view = View()
		view.ip = ip
		view.content = content
		view.put()
		# TODO: create a token!! put it in the right account!
		succeed(view.key.urlsafe())
	else:
		fail("what? bad action: %s"%(action,))

respond(response)