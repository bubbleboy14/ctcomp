from cantools import db
from six import string_types
from cantools.web import send_mail
from cantools.geo import address2latlng
from ctcoop.model import Conversation, Tag
from ctmap.model import getzip, Place
from compTemplates import BOARD, RESOURCE, LIBITEM

class Resource(Place):
	editors = db.ForeignKey(kind="Person", repeated=True)
	name = db.String()
	description = db.Text()
	tags = db.ForeignKey(kind=Tag, repeated=True)
	icon = db.String() # refers to ctmap graphic resource
	label = "name"

	def _pre_trans_zipcode(self, val):
		if isinstance(val, string_types) and len(val) < 10:
			val = getzip(val).key
		return val

	def oncreate(self):
		zcode = self.zipcode.get()
		addr = "%s, %s, %s"%(self.address, zcode.city, zcode.state)
		self.latitude, self.longitude = address2latlng(addr)

	def notify(self, podname, interested):
		bod = RESOURCE%(podname, self.name, self.description)
		for person in interested:
			send_mail(to=person.email, subject="new message board", body=bod)

class LibItem(db.TimeStampedBase):
	content = db.ForeignKey(kind="Content")
	editors = db.ForeignKey(kind="Person", repeated=True)
	name = db.String()
	description = db.Text()
	tags = db.ForeignKey(kind=Tag, repeated=True)
	label = "name"

	def notify(self, podname, interested):
		bod = LIBITEM%(podname, self.name, self.description)
		for person in interested:
			send_mail(to=person.email, subject="new message board", body=bod)

class Organization(LibItem):
	url = db.String()
	phone = db.String()

class Book(LibItem):
	author = db.String()
	read = db.String()
	buy = db.String()

class Web(LibItem):
	url = db.String()
	kind = db.String(choices=["site", "article", "video", "podcast", "pdf"])

class Media(LibItem):
	item = db.Binary()
	kind = db.String(choices=["img", "video", "audio", "pdf"])

class Board(db.TimeStampedBase):
	name = db.String()
	description = db.Text()
	anonymous = db.Boolean(default=False)
	tags = db.ForeignKey(kind=Tag, repeated=True)
	conversation = db.ForeignKey(kind=Conversation)
	label = "name"

	def pod(self):
		from .core import Pod
		return Pod.query(Pod.boards.contains(self.key.urlsafe())).get()

	def notify(self, podname, interested):
		bod = BOARD%(podname, self.name, self.description)
		for person in interested:
			send_mail(to=person.email, subject="new message board", body=bod)

	def oncreate(self):
		convo = Conversation(topic=self.name)
		convo.anonymous = self.anonymous
		convo.put()
		self.conversation = convo.key