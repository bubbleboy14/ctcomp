# ctcomp
This package includes the necessary blockchain/widget/api components for direct generative compensation for content creators.


# Back (Init Config)

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