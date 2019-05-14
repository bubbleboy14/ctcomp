comp.pods = {
	_: {
		nodes: {
			list: CT.dom.div(),
			main: CT.dom.div(null, "h1 mr160 relative"),
			right: CT.dom.div(null, "h1 w160p up5 scrolly right"),
			menu: CT.dom.div(null, "margined padded bordered round")
		}
	},
	fresh: function() {

	},
	pod: function(pod) {
		comp.core.proposals(pod.key, function(proposals) {
			decide.core.util.proposals(comp.pods._.nodes.main, proposals);
		});
	},
	pods: function(pods) {
		CT.panel.triggerList(pods, comp.pods.pod, comp.pods._.nodes.list);
	},
	memberships: function(memberships) {
		CT.db.multi(memberships.map(function(m) {
			return m.pod;
		}), comp.pods.pods);
	},
	menu: function() {
		var _ = comp.pods._;
		CT.dom.setContent(_.nodes.menu, [
			CT.dom.link("new pod", comp.pods.fresh, null, "bold"),
			_.nodes.list
		]);
		_.nodes.right.appendChild(_.nodes.menu);
		CT.dom.setContent("ctmain", [
			_.nodes.right,
			_.nodes.main
		]);
	},
	init: function() {
		comp.pods.menu();
		CT.db.get("membership", comp.pods.memberships, null, null, null, {
			person: user.core.get("key")
		});
	}
};