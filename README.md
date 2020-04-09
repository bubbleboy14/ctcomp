# ctcomp
This package includes the necessary blockchain/widget/api components for direct generative compensation for content creators.


# Back (Init Config)

    templates = "compTemplates.py"
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
    		"mileage": 1,
    		"delivery": 10,
    		"code": {
    			"line": 0.1,
    			"platform": 1,
    			"framework": 1,
    			"service": 0.5,
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
    	"feedback": {
    		"prompts": [
    			"did you feel respected and heard?",
    			"do you feel that all was addressed?"
    		],
    		"classes": {
    			"qbox": "margined padded bordered round"
    		},
    		"blurs": {
    			"question": ["be honest", "please be constructive"],
    			"notes": ["general comments", "overall feedback", "notes"]
    		}
    	},
    	"blurbs": {
    		"organization": "Helpful groups",
    		"book": "Good reads and sensible advice",
    		"web": "Web resources",
    		"media": "Related media",
    		"Ledger": "Check out this pod's ledger!",
    		"Boards": "Create and utilize message boards.",
    		"Needs": "What do you need? Please ask.",
    		"Offerings": "Would you like to offer something?",
    		"Library": "Add organizations, books, web resources, and media to the resource libary.",
    		"Drivers": "Can you help transport people and things? Click the 'join drivers' button to volunteer. Does someone or something need to get somewhere somehow? Click 'Requests' on the right to request a driver.",
    		"Resources": "Build resource maps.",
    		"Responsibilities": "Task management, including scheduling of and volunteering for pod-related activities.",
    		"Adjustments": "Democratically adjust compensation multipliers. Please consider difficulty and unpleasantness, as well as positive impact.",
    		"Commitments": "Register a weekly commitment.",
    		"Services": "Record a one-off service.",
    		"Requests": "Include and exclude pod members. Schedule conversations. Update your pod's blurb.",
    		"Content": "Submit web content associated with this pod (most managed pods don't require manual registration).",
    		"Codebases": "Register the codebases associated with this software pod, including platform and r&d repositories.",
    		"Dependencies": "Please select the frameworks and services used by this project.",
    		"Expenses": "Propose an expense (currently supported: one-off dividend).",
    		"Info": "Here's some basic info about this pod.",
    		"Products": "Sell goods and services. Ten percent goes to your pod.",
    		"Proposals": "Discuss and vote on your agenda and policies.",
    		"Updates": "Send updates to your podmates and hammer out the details."
    	}
    }