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
    			"framework": 1,
    			"dependency": 0.5,
    			"rnd": 0.2
    		}
    	}
    }
    requires = ["ctcoop", "ctstore"]

# Front (JS Config)

## core.config.ctcomp
### Import line: 'CT.require("core.config");'
    {
    	"limits": {
    		"services": 10,
    		"commitments": 40
    	},
    	"classes": {
    		"menu": "margined padded bordered round"
    	},
    	"blurbs": {
    		"commitment": "Register a weekly commitment.",
    		"service": "Record a one-off service.",
    		"request": "Include and exclude pod members. Schedule conversations.",
    		"content": "Submit web content associated with this pod (most managed pods don't require manual registration).",
    		"codebase": "Register the codebases associated with this software pod, including platform and r&d repositories.",
    		"dependency": "Please select the frameworks used by this project.",
    		"expense": "Propose an expense (currently supported: one-off dividend).",
    		"info": "Here's some basic info about this pod.",
    		"product": "Sell goods and services."
    	}
    }