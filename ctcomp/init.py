copies = {
	".": ["compTemplates.py"]
}
syms = {
	".": ["_comp.py"],
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