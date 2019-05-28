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
		sections: ["Proposals", "Commitments", "Services", "Requests", "Content", "Codebases"],
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
		codebase: function(c) {
			var deps = CT.dom.div(null, "centered");
			deps.update = function() {
				CT.db.multi(c.dependencies, function(dz) {
					CT.dom.setContent(deps, dz.map(function(d) {
						return CT.dom.div(d.repo, "bordered padded margined round inline-block");
					}));
				});
			};
			deps.update();
			return CT.dom.div([
				CT.dom.div(c.variety, "right"),
				CT.dom.div(c.owner + " / " + c.repo, "big"),
				deps, CT.dom.button("add dependencies", function() {
					comp.core.dependencies(c, function() {
						comp.core.edit({
							key: c.key,
							dependencies: c.dependencies
						}, deps.update);
					});
				})
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
			var _ = comp.pods._, pkey = _.current.pod.key;
			opts.membership = _.memberships[pkey].key;
			comp.core.prompt({
				prompt: "any notes?",
				isTA: true,
				cb: function(notes) {
					opts.notes = notes;
					comp.core.c(CT.merge(opts, {
						action: stype
					}), function(ckey) {
						opts.key = ckey;
						comp.core.podup(pkey, stype + "s", opts);
						CT.dom.addContent(_.nodes[stype + "_list"], _[stype](opts));
					});
				}
			});
		},
		submitter: function(stype) {
			var _ = comp.pods._, lims = _.limits, cur = _.current,
				pod = cur.pod, counts = cur.counts, diff, u;
			return function() {
				if (stype == "codebase") {
					u = user.core.get();
					if (!u.contributor)
						return alert("first, go to the settings page to register your github account!");
					CT.db.one(u.contributor, function(ucont) {
						comp.core.choice({
							data: ["platform", "research and development"],
							cb: function(variety) {
								comp.core.choice({
									data: CT.net.get("https://api.github.com/users/" + ucont.handle + "/repos", null, true),
									cb: function(project) {
										comp.core.edit({
											modelName: "codebase",
											pod: pod.key,
											owner: ucont.handle,
											repo: project.name,
											variety: variety
										}, function(cbase) {
											CT.data.add(cbase);
											CT.dom.addContent(_.nodes.codebase_list, _.codebase(cbase));
										});
									}
								});
							}
						});
					});
				} else if (stype == "content") {
					comp.core.prompt({
						prompt: "enter a descriptor for this content item (url, for instance)",
						cb: function(identifier) {
							comp.core.edit({
								modelName: "content",
								identifier: identifier,
								membership: _.memberships[pod.key].key
							}, function(content) {
								CT.data.add(content);
								CT.dom.addContent(_.nodes.content_list, _.content(content));
							});
						}
					});
				} else if (stype == "commitment") {
					diff = lims.commitments - counts.commitments;
					if (!diff)
						return alert("you're already committed to the max! scale back something else and try again ;)");
					comp.core.services(function(service) {
						comp.core.prompt({
							prompt: "how many hours per week?",
							style: "number",
							max: Math.min(5, diff),
							initial: Math.min(1, diff),
							cb: function(estimate) {
								counts.commitments += estimate;
								_.nodes.limits.update();
								_.submit({
									service: service.key,
									estimate: estimate
								}, stype);
							}
						});
					}, pod.variety);
				} else if (stype == "service") {
					if (lims.services == counts.services)
						return alert("you've served to the max today. take a breather and try again tomorrow ;)");
					comp.core.services(function(service) {
						comp.core.mates(pod.key, "select the workers", function(workers) {
							comp.core.mates(pod.key, "select the beneficiaries", function(bennies) {
								counts.services += 1;
								_.nodes.limits.update();
								_.submit({
									service: service.key,
									workers: workers.map(function(w) { return w.key; }),
									beneficiaries: bennies.map(function(b) { return b.key; })
								}, stype);
							});
						});
					}, pod.variety);
				} else if (stype == "request") {
					if (comp.core.size(pod.key) > 2) {
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
			CT.dom[(pod.variety == "software") ? "show" : "hide"]("tlCodebases");
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
		},
		pod: function(opts, label, cb) {
			label = label || "this pod";
			comp.core.prompt({
				prompt: "what will you call " + label + "?",
				cb: function(name) {
					comp.core.edit(CT.merge(opts, {
						modelName: "pod",
						name: name
					}), function(pod) {
						comp.core.edit({
							modelName: "membership",
							pod: pod.key,
							person: user.core.get("key")
						}, function(memship) {
							if (cb) return cb(pod);
							location.hash = pod.key;
							location.reload(); // TODO: replace hack w/ real deal
						});
					});
				}
			});
		}
	},
	fresh: function() {
		var _ = comp.pods._, ACP = "Agent/Client Pair (Managed Mode)";
		comp.core.varieties(function(variety) {
			if (variety == ACP) {
				_.pod({ variety: "software" }, "the agent pod", function(agent) {
					_.pod({
						variety: "managed",
						agent: agent.key
					}, "the managed pod");
				});
			} else
				_.pod({ variety: variety });
		}, ACP);
	},
	pod: function(pod) {
		var _ = comp.pods._,
			memship = _.memberships[pod.key];
		_.current.pod = pod;
		comp.core.membership(memship.key, function(data) {
			_.frame(data, "content");
		});
		comp.core.pod(pod.key, function(data) {
			["service", "commitment", "request", "codebase"].forEach(function(item) {
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