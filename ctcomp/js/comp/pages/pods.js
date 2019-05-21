CT.require("CT.all");
CT.require("core");
CT.require("user.core");
CT.require("comp.core");
CT.require("comp.pods");
CT.require("decide");

CT.onload(function() {
	CT.initCore();
	comp.pods.init();
});