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
    		},
    		"pay": 0.9 # member cut -- remainder goes to pod
    	},
    	"contract": {
    		"abi": None,
    		"owner": None,
    		"address": None
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
    		"Responsibilities": "Task management, including scheduling of and volunteering for pod-related activities.",
    		"Commitments": "Register a weekly commitment.",
    		"Services": "Record a one-off service.",
    		"Requests": "Include and exclude pod members. Schedule conversations. Update your pod's blurb.",
    		"Content": "Submit web content associated with this pod (most managed pods don't require manual registration).",
    		"Codebases": "Register the codebases associated with this software pod, including platform and r&d repositories.",
    		"Dependencies": "Please select the frameworks used by this project.",
    		"Expenses": "Propose an expense (currently supported: one-off dividend).",
    		"Info": "Here's some basic info about this pod.",
    		"Products": "Sell goods and services. Ten percent goes to your pod.",
    		"Proposals": "Discuss and vote on your agenda and policies.",
    		"Updates": "Send updates to your podmates and hammer out the details."
    	}
    }