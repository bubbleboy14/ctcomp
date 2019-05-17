from cantools import config

APPLY = """Hello!

%s has invited you to join a pod called "%s".

Click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=apply&request=%s'>here</a> to apply.

That's it!"""

APPLICATION = """Hello!

%s just applied for membership in the "%s" pod.

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> if you wish to allow it.

That's it!"""

EXCLUDE = """Hello!

%s has proposed excluding %s from the "%s" pod.

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> if you agree that this person should be excluded.

That's it!"""

SERVICE = """Hello!

%s of the "%s" pod has reported performing the following service: %s.

The following pod mates participated:

%s

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> to verify this service.

That's it!"""

COMMITMENT = """Hello!

%s of the "%s" pod commits to performing %s hours per week of the following service: %s.

Please click <a href='""" + config.web.protocol + """://""" + config.web.domain + """/_comp?action=verify&verifiable=%s&person=%s'>here</a> if you consider this realistic.

That's it!"""