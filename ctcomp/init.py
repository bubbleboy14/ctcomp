copies = {
	".": ["compTemplates.py", "cron.yaml"]
}
syms = {
	".": ["_comp.py", "_payday.py"],
	"html": ["comp"],
	"css": ["comp.css"],
	"js": ["comp"]
}
model = {
	"ctcomp.model": ["*"]
}
routes = {
	"/_comp": "_comp.py"
}
cfg = {
	"ratios": { # payout ratios
		"view": 0.1,
		"agent": 1,
		"resource": 1,
		"code": {
			"line": 0.1,
			"platform": 1,
			"framework": 1,
			"dependency": 0.5,
			"rnd": 0.2
		},
		"pay": 0.9 # member cut -- remainder goes to pod
	},
	"contract": {
		"abi": None,
		"owner": None,
		"address": None
	}
}
requires = ["ctcoop", "ctstore", "ctmap"]