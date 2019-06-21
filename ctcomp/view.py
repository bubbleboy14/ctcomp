from cantools.web import cgi_get, log
from model import db, enroll, manage, blogger_pod, View
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

def hoc(content, agent):
	if "blogger" in content:
		memship = enroll(agent, blogger_pod().key, content["blogger"])
		return manage(agent, memship, content["identifier"])
	return manage(agent, content["membership"], content["identifier"])

def cont(content, agent):
	return isinstance(content, basestring) and db.get(content) or hoc(content, agent)