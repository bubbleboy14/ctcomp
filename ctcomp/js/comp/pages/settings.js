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
CT.require("comp.ledger");
CT.require("comp.settings");
CT.net.setSpinner(true);
CT.db.setPagerLimit(30);

CT.onload(function() {
	CT.initCore();
	comp.settings.init();
});