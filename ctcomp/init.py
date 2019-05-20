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
requires = ["ctcoop"]