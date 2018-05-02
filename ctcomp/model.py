from cantools import db

class View(db.TimeStampedBase):
	ip = db.String()
	content = db.String() # content key string of some sort -- url for example