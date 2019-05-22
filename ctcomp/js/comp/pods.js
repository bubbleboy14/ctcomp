comp.pods = {
	_: {
		current: {},
		memberships: {},
		limits: { services: 10, commitments: 40 },
		classes: {
			menu: "margined padded bordered round"
		},
		nodes: {
			list: CT.dom.div(),
			views: CT.dom.div(),
			limits: CT.dom.div(null, "abs cbl"),
			slider: CT.dom.div(null, null, "slider"),
			main: CT.dom.div(null, "h1 mr160 relative"),
			right: CT.dom.div(null, "h1 w160p up5 scrolly right")
		},
		sections: ["Proposals", "Commitments", "Services", "Requests", "Content"],
		proposal: function(key) {
			var _ = comp.pods._,
				memship = _.memberships[_.current.pod.key];
			memship.proposals.push(key);
			comp.core.edit({
				key: memship.key,
				proposals: memship.proposals
			});
		},
		item: function(header, data, extras) {
			return CT.dom.div([
				CT.dom.div("submitted by: " + CT.data.get(CT.data.get(data.membership).person).email, "right"),
				CT.dom.div(header, "big"),
				data.notes,
				extras,
				data.passed ? "passed" : "pending"
			], "bordered padded margined");
		},
		content: function(c) {
			return CT.dom.div([
				CT.dom.div("submitted by: " + CT.data.get(CT.data.get(c.membership).person).email, "right"),
				CT.dom.div(c.identifier, "big"),
				[
					"add <b>&lt;iframe src='",
					location.protocol,
					"//",
					location.host,
					"/comp/view.html#",
					c.key,
					"'&gt;&lt;/iframe&gt;</b> to your web page"
				].join("")
			], "bordered padded margined");
		},
		service: function(a) { // act
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
						CT.dom.addContent(_.nodes[stype + "_list"], _[stype](opts));
					});
				}
			});
		},
		submitter: function(stype) {
			var _ = comp.pods._;
			return function() {
				if (stype == "content") {
					comp.core.prompt({
						prompt: "enter a descriptor for this content item (url, for instance)",
						cb: function(identifier) {
							comp.core.edit({
								modelName: "content",
								identifier: identifier,
								membership: _.memberships[_.current.pod.key].key
							}, function(content) {
								CT.data.add(content);
								CT.dom.addContent(_.nodes.content_list, _.content(content));
							});
						}
					});
				} else if (stype == "commitment") {
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
				} else if (stype == "service") {
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
				} else if (stype == "request") {
					if (comp.core.size(_.current.pod.key) > 2) {
						comp.core.choice({
							data: ["include", "exclude"],
							cb: _.change
						});
					} else
						_.change("include");
				}
			};
		},
		change: function(change) {
			var _ = comp.pods._;
			if (change == "include") {
				comp.core.prompt({
					prompt: "what's this person's email address?",
					cb: function(email) {
						if (!CT.parse.validEmail(email))
							return alert("that's not an email address!");
						CT.db.get("person", function(peeps) {
							var person = peeps[0];
							if (!person)
								return alert(email + " isn't in our system! ask your friend to join first :)");
							_.submit({
								person: person.key,
								change: change
							}, "request");
						}, 1, 0, null, {
							email: email
						});
					}
				});
			} else { // exclude
				comp.core.mates(_.current.pod.key, "kick out whom?", function(person) {
					_.submit({
						person: person.key,
						change: change
					}, "request");
				}, "single-choice");
			}
		},
		restrictions: function() {
			var pod = comp.pods._.current.pod,
				size = comp.core.size(pod.key),
				unrestricted = !pod.agent && (size > 1),
				action = unrestricted ? "show" : "hide",
				reaction = pod.agent ? "hide" : "show";
			["Requests", "Commitments", "Services"].forEach(function(section, i) {
				CT.dom[i ? action : reaction]("tl" + section);
			});
			unrestricted || CT.dom.id("tlProposals").firstChild.onclick();
		},
		frame: function(data, item, plur) {
			var _ = comp.pods._;
			plur = plur || item;
				n = _.nodes[item + "_list"] = CT.dom.div(data[plur].map(_[item]));
			CT.dom.setContent(_.nodes[plur], [
				CT.dom.button("new", _.submitter(item), "right"),
				CT.dom.div(CT.parse.capitalize(plur), "biggest"),
				n
			]);
		}
	},
	fresh: function() {
		comp.core.prompt({
			prompt: "what will you call this pod?",
			cb: function(name) {
				comp.core.choice({
					prompt: "associate your pod with an agent? (probably not)",
					data: ["no agent"].concat(comp.pods._.current.pods),
					cb: function(agent) {
						var popts = {
							modelName: "pod",
							name: name
						};
						if (agent != "no agent")
							popts.agent = agent.key;
						comp.core.edit(popts, function(pod) {
							comp.core.edit({
								modelName: "membership",
								pod: pod.key,
								person: user.core.get("key")
							}, function(memship) {
								location.hash = pod.key;
								location.reload(); // TODO: replace hack w/ real deal
							});
						});
					}
				});
			}
		});
	},
	pod: function(pod) {
		var _ = comp.pods._,
			memship = _.memberships[pod.key];
		_.current.pod = pod;
		comp.core.membership(memship.key, function(data) {
			_.frame(data, "content");
		});
		comp.core.pod(pod.key, function(data) {
			["service", "commitment", "request"].forEach(function(item) {
				_.frame(data, item, item + "s");
			});
			decide.core.util.proposals(_.nodes.proposals, data.proposals);
			_.restrictions();
		});
	},
	pods: function(pods) {
		var h = location.hash.slice(1),
			n = CT.panel.triggerList(pods, comp.pods.pod, comp.pods._.nodes.list);
		comp.pods._.current.pods = pods;
		if (h) location.hash = "";
		(h && CT.dom.id("tl" + h) || n.firstChild).firstChild.onclick();
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
		nodes.slider._slider = CT.panel.slider([], nodes.views,
			nodes.slider, null, null, null, true);
		_.sections.forEach(function(section, i) {
			nodes[section.toLowerCase()] = nodes.slider._slider.add(section, !i);
		});
	},
	limits: function(data) {
		var _ = comp.pods._, n = _.nodes.limits, lims = _.limits;
		_.current.counts = data;
		n.update = function() {
			CT.dom.setContent(n, [
				data.services + " / " + lims.services + " acts (daily service limit)",
				data.commitments + " / " + lims.commitments + " hours (weekly commitment limit)"
			]);
		};
		n.update();
		CT.dom.addContent("ctmain", n);
	},
	person: function(data) {
		comp.pods.memberships(data.memberships);
		delete data.memberships;
		comp.pods.limits(data);
	},
	init: function() {
		comp.core.init();
		comp.pods.menu();
		comp.pods.slider();
		decide.core.util.onNew(comp.pods._.proposal);
		comp.core.person(user.core.get("key"), comp.pods.person);
	}
};