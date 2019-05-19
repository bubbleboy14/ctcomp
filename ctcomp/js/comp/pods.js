comp.pods = {
	_: {
		current: {},
		memberships: {},
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
		sections: ["Commitments", "Services", "Requests", "Proposals"],
		proposal: function(key) {
			var _ = comp.pods._,
				memship = _.memberships[_.current.pod.key];
			memship.proposals.push(key);
			comp.core.edit({
				key: memship.key,
				proposals: memship.proposals
			});
		}
	},
	fresh: function() {

	},
	pod: function(pod) {
		var _ = comp.pods._;
		_.current.pod = pod;
		comp.core.pod(pod.key, function(data) {
			decide.core.util.proposals(_.nodes.proposals, data.proposals);
			CT.dom.setContent(_.nodes.services, data.acts.map(function(a) {
				return CT.dom.div([
					CT.dom.div(comp.core.service(a.service).name, "big"),
					a.notes,
					a.passed ? "passed" : "pending"
				], "bordered padded margined");
			}));
			CT.dom.setContent(_.nodes.requests, data.requests.map(function(r) {
				return CT.dom.div([
					CT.dom.div(r.action, "big"),
					r.passed ? "passed" : "pending"
				], "bordered padded margined");
			}));
			CT.dom.setContent(_.nodes.commitments, data.commitments.map(function(c) {
				return CT.dom.div([
					CT.dom.div(comp.core.service(c.service).name, "big"),
					c.estimate + " hours per week",
					c.passed ? "passed" : "pending"
				], "bordered padded margined");
			}));
		});
	},
	pods: function(pods) {
		CT.panel.triggerList(pods, comp.pods.pod, comp.pods._.nodes.list);
	},
	memberships: function(memberships) {
		var _ = comp.pods._;
		CT.db.multi(memberships.map(function(m) {
			_.memberships[m.pod] = m;
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
		comp.core.init();
		comp.pods.menu();
		comp.pods.slider();
		decide.core.util.onNew(comp.pods._.proposal);
		CT.db.get("membership", comp.pods.memberships, null, null, null, {
			person: user.core.get("key")
		});
	}
};