from cantools import config

APPLY = """Hello!

%s has invited you to join a pod called "%s".

Click <a href='http://""" + config.web.domain + """/_comp?action=apply&request=%s'>here</a> to apply.

That's it!"""

APPLICATION = """Hello!

%s just applied for membership in the "%s" pod.

Please click <a href='http://""" + config.web.domain + """/_comp?action=verify&verifiable=%s'>here</a> if you wish to allow it.

That's it!"""