CT.require("CT.all");
CT.require("core");
CT.require("user.core");
CT.require("comp.core");
CT.require("decide");

CT.onload(function() {
	CT.initCore();
	CT.db.get("membership", comp.core.pods, null, null, null, {
		person: user.core.get("key")
	});
});