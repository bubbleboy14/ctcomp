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
    cfg = {
    	"ratios": { # payout ratios
    		"view": 0.1,
    		"agent": 1,
    		"code": {
    			"line": 0.1,
    			"platform": 1,
    			"dependency": 0.5,
    			"rnd": 0.2
    		}
    	}
    }
    requires = ["ctcoop"]