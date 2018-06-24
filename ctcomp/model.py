from cantools import db

class View(db.TimeStampedBase):
	user = db.String()    # default to ip
	content = db.String() # content key string of some sort -- url for example