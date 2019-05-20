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
		},
		item: function(header, data, notes) {
			return CT.dom.div([
				CT.dom.div(header, "big"),
				"submitted by: " + CT.data.get(CT.data.get(data.membership).person).email,
				notes || data.notes,
				data.passed ? "passed" : "pending"
			], "bordered padded margined");
		},
		act: function(a) {
			return comp.pods._.item(CT.data.get(a.service).name, a);
		},
		request: function(r) {
			return comp.pods._.item(r.action + " " + CT.data.get(r.person).email, r);
		},
		commitment: function(c) {
			return comp.pods._.item(CT.data.get(c.service).name,
				c, c.estimate + " hours per week");
		},
		submit: function(opts, stype) {
			var _ = comp.pods._;
			opts.membership = _.memberships[_.current.pod.key].key;
			comp.core.prompt({
				prompt: "any notes?",
				isTA: true,
				cb: function(notes) {
					opts.notes = notes;
					comp.core.c(CT.merge(opts, {
						action: stype
					}), function(ckey) {
						opts.key = ckey;
						CT.data.add(opts);
						
						var n = _[stype](opts);
						// TODO: add n to appropriate lister node!!!
					});
				}
			});
		},
		submitter: function(stype) {
			var _ = comp.pods._;
			return function() {
				if (stype == "commit") {
					comp.core.services(function(service) {
						comp.core.prompt({
							prompt: "how many hours per week?",
							style: "number",
							cb: function(estimate) {
								_.submit({
									service: service.key,
									estimate: estimate
								}, stype);
							}
						});
					});
				} else if (stype == "act") {
					comp.core.services(function(service) {
						comp.core.mates(_.current.pod.key, "select the workers", function(workers) {
							comp.core.mates(_.current.pod.key, "select the beneficiaries", function(bennies) {
								_.submit({
									workers: workers.map(function(w) { return w.key; }),
									beneficiaries: bennies.map(function(b) { return b.key; })
								}, stype);
							});
						});
					});
				} else if (style == "request") {
					// action, person
				}
			};
		}
	},
	fresh: function() {

	},
	pod: function(pod) {
		var _ = comp.pods._;
		_.current.pod = pod;
		comp.core.pod(pod.key, function(data) {
			decide.core.util.proposals(_.nodes.proposals, data.proposals);
			CT.dom.setContent(_.nodes.services, [
				CT.dom.button("new", _.submitter("act"), "right"),
				CT.dom.div("Services", "biggest"),
				data.acts.map(_.act)
			]);
			CT.dom.setContent(_.nodes.requests, [
				CT.dom.button("new", _.submitter("request"), "right"),
				CT.dom.div("Requests", "biggest"),
				data.requests.map(_.request)
			]);
			CT.dom.setContent(_.nodes.commitments, [
				CT.dom.button("new", _.submitter("commit"), "right"),
				CT.dom.div("Commitments", "biggest"),
				data.commitments.map(_.commitment)
			]);
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