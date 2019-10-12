from cantools.web import respond, succeed, fail, cgi_get, local, send_mail, redirect
from model import db, enroll, manage, Person, Content, Payment, Act, Commitment, Request, Expense
from compTemplates import APPLY, APPLICATION, EXCLUDE, BLURB, SERVICE, COMMITMENT, PAYMENT, EXPENSE, CONFCODE, CONVO
from ctcomp.view import views

def response():
	action = cgi_get("action", choices=["view", "pay", "service", "commitment", "request", "expense", "verify", "unverify", "apply", "join", "pod", "membership", "person", "enroll", "manage", "confcode", "mint", "balance", "responsibilities"])
	if action == "view":
		ip = local("response").ip
		user = cgi_get("user", required=False) # key
		if user:
			user = db.get(user)
		else:
			user = Person.query(Person.ip == ip).get()
		if not user:
			user = Person()
			user.ip = ip
			user.put()
		views(user)
	elif action == "mint":
		user = db.get(cgi_get("user"))
		amount = cgi_get("amount")
		user.wallet.get().mint(amount)
	elif action == "balance":
		user = db.get(cgi_get("user"))
		succeed(user.wallet.get().balance())
	elif action == "pay":
		payer = db.get(cgi_get("payer"))
		memship = db.get(cgi_get("membership"))
		person = memship.person.get()
		pod = memship.pod.get()
		pment = Payment()
		pment.membership = memship.key
		pment.payer = payer.key
		pment.amount = cgi_get("amount")
		pment.notes = cgi_get("notes")
		if payer.key.urlsafe() == person.key.urlsafe():
			fail("pay yourself?")
		if payer.wallet.get().outstanding < pment.amount:
			fail("you don't have enough in your account!")
		pment.put()
		pkey = pment.key.urlsafe()
		pment.notify("confirm payment", lambda signer : PAYMENT%(pment.amount,
			person.firstName, pod.name, pment.notes, pkey, signer.urlsafe()))
		succeed(pkey)
	elif action == "service":
		act = Act()
		act.membership = cgi_get("membership")
		act.service = cgi_get("service")
		act.workers = cgi_get("workers")
		act.beneficiaries = cgi_get("beneficiaries")
		act.notes = cgi_get("notes")
		act.put()
		akey = act.key.urlsafe()
		service = act.service.get()
		memship = act.membership.get()
		person = memship.person.get()
		pod = memship.pod.get()
		workers = "\n".join([w.email for w in db.get_multi(act.workers)])
		act.notify("verify service", lambda signer : SERVICE%(person.email,
			pod.name, service.name, act.notes, workers, akey, signer.urlsafe()))
		succeed(akey)
	elif action == "commitment":
		comm = Commitment()
		comm.membership = cgi_get("membership")
		comm.service = cgi_get("service")
		comm.estimate = cgi_get("estimate")
		comm.notes = cgi_get("notes")
		comm.put()
		comm.verify(comm.membership.get().person) # (submitter already agrees)
		ckey = comm.key.urlsafe()
		service = comm.service.get()
		memship = comm.membership.get()
		person = memship.person.get()
		pod = memship.pod.get()
		comm.notify("affirm commitment", lambda signer : COMMITMENT%(person.email,
			pod.name, comm.estimate, service.name, comm.notes, ckey, signer.urlsafe()))
		succeed(ckey)
	elif action == "request":
		req = Request()
		req.membership = cgi_get("membership")
		req.change = cgi_get("change")
		req.person = cgi_get("person")
		req.notes = cgi_get("notes")
		req.put()
		rpmail = req.person.get().email
		memship = req.membership.get()
		mpmail = memship.person.get().email
		pod = memship.pod.get()
		rkey = req.key.urlsafe()
		if req.change == "include":
			send_mail(to=rpmail, subject="pod membership nomination",
				body=APPLY%(mpmail, pod.name, rkey))
		elif req.change == "exclude":
			req.notify("pod membership exclusion proposal",
				lambda signer : EXCLUDE%(mpmail, rpmail, pod.name, rkey, signer.urlsafe()))
		elif req.change == "blurb":
			req.notify("pod blurb update proposal",
				lambda signer: BLURB%(mpmail, pod.name, req.notes, rkey, signer.urlsafe()))
		else: # conversation
			req.notify("pod conversation request",
				lambda signer : CONVO%(mpmail, pod.name, req.notes, rkey, signer.urlsafe()))
		succeed(req.key.urlsafe())
	elif action == "expense":
		exp = Expense()
		exp.membership = cgi_get("membership")
		exp.executor = cgi_get("executor", required=False)
		exp.variety = cgi_get("variety", choices=["dividend", "reimbursement"])
		exp.amount = cgi_get("amount")
		exp.recurring = cgi_get("recurring")
		exp.notes = cgi_get("notes")
		exp.put()
		memship = exp.membership.get()
		mpmail = memship.person.get().email
		pod = memship.pod.get()
		variety = exp.variety
		amount = exp.amount
		if exp.executor:
			variety = "%s - executor: %s"%(variety, exp.executor.get().email)
		else:
			amount = "%s%%"%(amount * 100,)
		exp.notify("approve expense", lambda signer: EXPENSE%(mpmail, pod.name,
			variety, amount, exp.recurring, exp.notes, signer.urlsafe()))
		succeed(exp.key.urlsafe())
	elif action == "verify":
		verifiable = db.get(cgi_get("verifiable")) # act/request/commitment/expense
		verifiable.verify(db.KeyWrapper(cgi_get("person")))
		redirect("/comp/pods.html", "you did it!")
	elif action == "unverify": # commitment only!!!!??!
		vkey = cgi_get("verifiable")
		verifiable = db.get(vkey)
		verifiable.unverify()
		service = verifiable.service.get()
		memship = verifiable.membership.get()
		person = memship.person.get()
		pod = memship.pod.get()
		for signer in pod.members():
			send_mail(to=signer.get().email, subject="affirm commitment - estimate adjustment",
				body=COMMITMENT%(person.email, pod.name, verifiable.estimate,
					service.name, vkey, signer.urlsafe()))
	elif action == "apply":
		req = db.get(cgi_get("request"))
		memship = req.membership.get()
		pod = memship.pod.get()
		em = req.person.get().email
		rkey = req.key.urlsafe()
		for mem in pod.members():
			send_mail(to=mem.get().email, subject="pod membership application",
				body=APPLICATION%(em, pod.name, rkey, mem.urlsafe()))
		redirect("/comp/pods.html", "you did it!")
	elif action == "join": # support only
		pod = db.get(cgi_get("pod"))
		if pod.variety != "support":
			fail()
		person = db.get(cgi_get("person"))
		succeed(person.enroll(pod).urlsafe())
	elif action == "pod":
		pod = db.get(cgi_get("pod"))
		succeed({
			"services": [a.data() for a in pod.acts()],
			"requests": [r.data() for r in pod.requests()],
			"proposals": [p.data() for p in db.get_multi(pod.proposals())],
			"commitments": [c.data() for c in pod.commitments()],
			"memberships": [m.data() for m in pod.members(True)],
			"people": [p.data() for p in db.get_multi(pod.members())],
			"codebases": [c.data() for c in pod.codebases()],
			"expenses": [e.data() for e in pod.expenses()]
		})
	elif action == "membership":
		memship = db.get(cgi_get("membership"))
		succeed({
			"content": [c.data() for c in Content.query(Content.membership == memship.key).fetch()],
			"products": [p.data() for p in db.get_multi(memship.products)]
		})
	elif action == "person":
		person = db.get(cgi_get("person"))
		succeed({
			"services": len(person.acts()), # more efficient way?
			"memberships": [m.data() for m in person.memberships()],
			"commitments": sum([c.estimate for c in person.commitments()])
		})
	elif action == "responsibilities":
		person = db.get(cgi_get("person"))
		succeed([t.data() for t in person.tasks()])
	elif action == "enroll":
		succeed(enroll(cgi_get("agent"), cgi_get("pod"), cgi_get("person")).urlsafe())
	elif action == "manage":
		succeed(manage(cgi_get("agent"), cgi_get("membership"), cgi_get("content")).key.urlsafe())
	elif action == "confcode":
		send_mail(to=cgi_get("email"), subject="carecoin confirmation code",
			body=CONFCODE%(cgi_get("code"),))

respond(response)