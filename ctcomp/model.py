from cantools import db
from ctuser.model import CTUser

class Content(db.TimeStampedBase):
	owner = db.ForeignKey(kind=CTUser)
	identifier = db.String() # some hash, defaulting to url

class View(db.TimeStampedBase):
	viewer = db.ForeignKey(kind=CTUser)
	content = db.ForeignKey(kind=Content)