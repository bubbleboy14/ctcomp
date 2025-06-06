CT.require("CT.align");
CT.require("CT.cal");
CT.require("CT.chat");
CT.require("CT.data");
CT.require("CT.db");
CT.require("CT.dom");
CT.require("CT.file");
CT.require("CT.key");
CT.require("CT.layout");
CT.require("CT.modal");
CT.require("CT.Pager");
CT.require("CT.panel");
CT.require("CT.parse");
CT.require("CT.pubsub");
CT.require("CT.storage");
CT.require("CT.trans");
CT.require("core");
CT.require("user.core");
CT.require("cal.core");
CT.require("coop.Updates");
CT.require("comp.core");
CT.require("comp.live");
CT.require("comp.pods");
CT.require("comp.forms");
CT.require("comp.ledger");
CT.require("comp.library");
CT.require("comp.generation");
CT.require("comp.submission");
CT.require("decide");

CT.onload(function() {
	CT.initCore();
	comp.pods.init();
});