from cantools import db, config
from cantools.util import log
from cantools.web import fetch

ratios = config.ctcomp.ratios

class Contributor(db.TimeStampedBase):
	handle = db.String()

class Codebase(db.TimeStampedBase):
	pod = db.ForeignKey(kind="Pod")
	owner = db.String() # bubbleboy14
	repo = db.String()  # ctcomp
	variety = db.String(choices=["platform", "framework", "service", "research and development"])
	dependencies = db.ForeignKey(kind="Codebase", repeated=True)
	label = "repo"

	def deposit(self, amount, deed):
		log('compensating "%s/%s" codebase: %s'%(self.owner, self.repo, amount))
		contz = self.contributions()
		total = float(sum([cont.count for cont in contz]))
		platcut = amount * ratios.code.get(self.variety, ratios.code.rnd)
		log('dividing %s cut (%s) among %s contributors'%(self.variety, platcut, len(contz)))
		details = "variety: %s\nowner: %s"%(self.variety, self.owner)
		for contrib in contz:
			memship = contrib.membership()
			memship and memship.deposit(platcut * contrib.count / total, deed,
				"code usage: %s@%s"%(contrib.handle(), self.repo), details, True)
		depcut = amount * ratios.code.dependency
		dnum = len(self.dependencies)
		if dnum:
			depshare = depcut / dnum
			log('dividing dependency cut (%s) among %s codebases'%(depcut, dnum))
			for dep in db.get_multi(self.dependencies):
				dep.deposit(depshare, deed)

	def contributions(self, asmap=False):
		clist = Contribution.query(Contribution.codebase == self.key).fetch()
		if not asmap:
			return clist
		contz = {}
		for cont in clist:
			contz[cont.contributor.get().handle] = cont
		return contz

	def refresh(self, cbatch):
		from .util import getContribution
		freshies = fetch("api.github.com", "/repos/%s/%s/contributors"%(self.owner,
			self.repo), asjson=True, protocol="https")
		pcount = 0
		ccount = 0
		for item in freshies:
			log("checking for: %s"%(item["login"],), 1)
			contrib = getContribution(self, item["login"])
			if contrib:
				pcount += 1
				ccount += contrib.refresh(item["contributions"], cbatch)
		return "%s/%s: %s contributors, %s contributions"%(self.owner, self.repo, pcount, ccount)

class Contribution(db.TimeStampedBase):
	codebase = db.ForeignKey(kind=Codebase)
	contributor = db.ForeignKey(kind=Contributor)
	count = db.Integer(default=0)

	def handle(self):
		return self.contributor.get().handle

	def membership(self):
		from .core import Person, Membership
		person = Person.query(Person.contributors.contains(self.contributor.urlsafe())).get()
		pod = db.get(self.codebase).pod
		return person and pod and Membership.query(Membership.pod == pod, Membership.person == person.key).get()

	def total(self):
		return self.count * ratios.code.line

	def process(self, cbatch, diff, total=0):
		cbase = self.codebase.get()
		self.membership().deposit(diff * ratios.code.line, cbatch,
			"code commits: %s@%s"%(self.handle(), cbase.repo),
			"variety: %s\nowner: %s\nbatch: %s\ntotal: %s"%(cbase.variety,
				cbase.owner, diff, total || diff), True)

	def refresh(self, total, cbatch):
		diff = total - self.count
		if diff:
			self.process(cbatch, diff, total)
			self.count = total
			self.put()
		return diff