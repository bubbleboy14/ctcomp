CT.require("CT.align");
CT.require("CT.data");
CT.require("CT.db");
CT.require("CT.dom");
CT.require("CT.layout");
CT.require("CT.modal");
CT.require("CT.parse");
CT.require("CT.storage");
CT.require("CT.trans");
CT.require("core");
CT.require("user.core");
CT.require("comp.core");
CT.require("comp.feedback");

CT.onload(function() {
	CT.initCore();
	new comp.feedback.Feedback(core.config.ctcomp.feedback);
});