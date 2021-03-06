from cantools.web import cgi_get, log
from model import db, enroll, manage, blogger_pod, View
from cantools import config
from six import string_types

def view(user, content):
	if View.query(View.viewer == user.key, View.content == content.key).get():
		return log("already viewed (user %s; content %s)"%(user.key.urlsafe(), content.key.urlsafe()))
	v = View()
	v.viewer = user.key
	v.content = content.key
	v.put()
	v.process()

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
	return manage(agent, content.get("membership"),
		content["identifier"], content.get("memberships"))

def cont(content, agent):
	return isinstance(content, string_types) and db.get(content) or hoc(content, agent)