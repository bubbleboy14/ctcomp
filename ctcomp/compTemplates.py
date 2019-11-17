from cantools import config

APPLY = """Hello!

%s has invited you to join a pod called "%s".

Click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=apply&request=%s'>here</a> to apply.

That's it!"""

APPLICATION = """Hello!

%s just applied for membership in the "%s" pod.

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> if you wish to allow it.

That's it!"""

INVITATION = """Hello!

%s has invited you to join a pod called "%s".

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/user/register.html'>here</a> if you wish to join our site.

That's it!"""

EXCLUDE = """Hello!

%s has proposed excluding %s from the "%s" pod.

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> if you agree that this person should be excluded.

That's it!"""

BLURB = """Hello!

%s has proposed updating the "%s" pod's official blurb. Here's the new version:

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> if you agree that this should be your pod's new blurb.

That's it!"""

DELIVERY = """Hello!

%s of the "%s" pod has requested a delivery. Here are the details:

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> if you would like to help in this way.

That's it!"""

DELIVERED = """Hello!

%s and %s have agreed to the discussed drop off. Here are the details:

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> to confirm the drop off took place.

Click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/comp/feedback.html#%s'>here</a> to offer feedback.

That's it!"""

ADJUSTMENT = """Hello!

Someone has proposed changing the compensation multiplier for the following service:

name: %s
variety: %s
current: %s
proposed: %s

And here's the rationale:

%s

Please visit the <a href='""" + config.web.protocol + """://""" + config.web.domain + """/comp/pods.html'>pods page</a> to review, propose, and vote on compensation adjustments.

That's it!"""

ADJUSTED = """Hello!

The following compensation multiplier adjustment has been approved:

name: %s
variety: %s
previous: %s
new: %s

And here's the rationale:

%s

Please visit the <a href='""" + config.web.protocol + """://""" + config.web.domain + """/comp/pods.html'>pods page</a> to review, propose, and vote on compensation adjustments.

That's it!"""

APPOINTMENT = """Hello!

%s of the "%s" pod committed to the following appointment: %s. Details:

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> to confirm that this appointment took place.

Click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/comp/feedback.html#%s'>here</a> to offer feedback.

That's it!"""

REMINDER = """Hello!

You have committed to the following activities tomorrow:

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/coop/cal.html'>here</a> to review your calendar.

That's it!"""

SERVICE = """Hello!

%s of the "%s" pod has reported performing the following service: %s. Details:

%s

The following pod mates participated:

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> to verify this service.

Click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/comp/feedback.html#%s'>here</a> to offer feedback.

That's it!"""

COMMITMENT = """Hello!

%s of the "%s" pod commits to performing %s hours per week of the following service: %s. Details:

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> if you consider this realistic.

That's it!"""

PAYMENT = """Hello!

Would you like to pay %s coins to %s of the "%s" pod? Here are some details:

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> to confirm.

That's it!"""

PAID = """Hello!

Looks like the transfer went through!

Amount: %s
Payer: %s
Recipient: %s of the "%s" pod

Details:

%s

That's it!"""

EXPENSE = """Hello!

%s of the "%s" pod proposes the following expense:

variety: %s
amount: %s
recurring: %s

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> if you approve.

That's it!"""

CONFCODE = """Hello!

You've requested a confirmation code. Here it is:

%s

That's it!"""

CONVO = """Hello!

%s of the "%s" pod would like to have a conversation. Details:

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> to schedule the meeting.

That's it!"""

MEET = """Hello!

The "%s" pod has just scheduled a meeting. Details:

%s

Please click <a href='https://fzn.party/stream/widget.html#%s_chat'>here</a> to join the meeting.

That's it!"""