comp.pods = {
	_: {
		classes: {
			menu: "margined padded bordered round"
		},
		nodes: {
			list: CT.dom.div(),
			views: CT.dom.div(),
			slider: CT.dom.div(null, null, "slider"),
			main: CT.dom.div(null, "h1 mr160 relative"),
			right: CT.dom.div(null, "h1 w160p up5 scrolly right")
		},
		sections: ["Commitments", "Services", "Requests", "Proposals"]
	},
	fresh: function() {

	},
	pod: function(pod) {
		comp.core.proposals(pod.key, function(proposals) {
			decide.core.util.proposals(comp.pods._.nodes.proposals, proposals);
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
		CT.dom.setContent(_.nodes.right, [
			CT.dom.div([
				CT.dom.link("new pod", comp.pods.fresh, null, "bold"),
				_.nodes.list
			], _.classes.menu),
			CT.dom.div([
				CT.dom.div("Views", "bold"),
				_.nodes.views
			], _.classes.menu)
		]);
		CT.dom.setContent(_.nodes.main, _.nodes.slider);
		CT.dom.setContent("ctmain", CT.dom.div([
			_.nodes.right,
			_.nodes.main
		], "full"));
	},
	slider: function() {
		var _ = comp.pods._, nodes = _.nodes;
		nodes.slider._slider = CT.panel.slider([], nodes.views, nodes.slider, null, "bold", null, true);
		_.sections.forEach(function(section, i) {
			nodes[section.toLowerCase()] = nodes.slider._slider.add(section, !i);
		});
	},
	init: function() {
		comp.pods.menu();
		comp.pods.slider();
		CT.db.get("membership", comp.pods.memberships, null, null, null, {
			person: user.core.get("key")
		});
	}
};