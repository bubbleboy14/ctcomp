CT.require("CT.align");
CT.require("CT.cal");
CT.require("CT.chat");
CT.require("CT.data");
CT.require("CT.db");
CT.require("CT.dom");
CT.require("CT.file");
CT.require("CT.layout");
CT.require("CT.modal");
CT.require("CT.panel");
CT.require("CT.parse");
CT.require("CT.pubsub");
CT.require("CT.storage");
CT.require("CT.trans");
CT.require("core");
CT.require("user.core");
CT.require("coop.cal");
CT.require("coop.Updates");
CT.require("comp.core");
CT.require("comp.live");
CT.require("comp.pods");
CT.require("decide");
CT.net.setSpinner(true);

CT.onload(function() {
	CT.initCore();
	comp.pods.init();
});