CT.require("CT.all");
CT.require("core");
CT.require("user.core");
CT.require("comp.core");
CT.require("comp.boards");

CT.onload(function() {
	CT.initCore();
	comp.boards.init();
});