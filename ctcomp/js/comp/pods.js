comp.pods = {
	_: {
		current: {},
		agents: {},
		codebases: {},
		responsibilities: {},
		nodes: {
			list: CT.dom.div(),
			views: CT.dom.div(),
			limits: CT.dom.div(null, "abs cbl"),
			slider: CT.dom.div(null, null, "slider"),
			main: CT.dom.div(null, "h1 mr160 relative"),
			right: CT.dom.div(null, "h1 w160p up5 scrolly right")
		},
		sections: ["Info", "Boards", "Needs", "Offerings", "Updates",
			"Library", "Drivers", "Resources", "Proposals", "Responsibilities",
			"Adjustments", "Commitments", "Services", "Requests", "Content",
			"Products", "Codebases", "Dependencies", "Expenses", "Ledger"],
		proposal: function(key) {
			var _ = comp.pods._,
				memship = comp.core.pod2memship(_.current.pod);
			memship.proposals.push(key);
			comp.core.edit({
				key: memship.key,
				proposals: memship.proposals
			});
		},
		update: function(up) {
			var _ = comp.pods._, pod = _.current.pod;
			pod.updates.push(up.key);
			comp.core.edit({
				key: pod.key,
				updates: pod.updates
			});
		},
		restrictions: function() {
			var pod = comp.pods._.current.pod,
				size = comp.core.size(pod.key),
				unrestricted = !pod.agent && (size > 1),
				action = unrestricted ? "show" : "hide",
				reaction = pod.agent ? "hide" : "show",
				showSoft = (pod.variety == "software") ? "show" : "hide",
				libaction = (pod.variety == "support") ? "show" : "hide",
				driaction = (pod.variety == "care work") ? "show" : "hide",
				resaction = ["resource mapping", "care work",
					"support"].includes(pod.variety) ? "show" : "hide";
			["Updates", "Commitments", "Services"].forEach(function(section) {
				CT.dom[action]("tl" + section);
			});
			["Requests", "Responsibilities", "Adjustments"].forEach(function(section) {
				CT.dom[reaction]("tl" + section);
			});
			["Codebases", "Dependencies"].forEach(function(section) {
				CT.dom[showSoft]("tl" + section);
			});
			CT.dom[libaction]("tlLibrary");
			CT.dom[driaction]("tlDrivers");
			CT.dom[resaction]("tlResources");
			unrestricted || CT.dom.id("tlInfo").firstChild.onclick();
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
		},
		setDrivers: function(pod) {
			var _ = comp.pods._, ukey = user.core.get("key"),
				driving = pod.drivers.includes(ukey),
				btxt = driving ? "stop being a driver" : "join drivers";
			CT.db.multi(pod.drivers, function(drz) {
				CT.dom.setContent(_.nodes.drivers, [
					CT.dom.button(btxt, function() {
						if (driving)
							CT.data.remove(pod.drivers, ukey);
						else
							pod.drivers.push(ukey);
						comp.core.edit({
							key: pod.key,
							drivers: pod.drivers
						});
						_.setDrivers(pod);
					}, "right"),
					CT.dom.div("Drivers", "biggest"),
					core.config.ctcomp.blurbs.Drivers,
					drz.map(function(d) {
						return CT.dom.div(d.firstName,
							"padded margined bordered round inline-block");
					})
				]);
			});
		},
		setAdjustments: function(pod) {
			CT.db.get("adjustment", function(adjustments) {
				comp.generation.frame({ adjustments: adjustments },
					"adjustment", "adjustments",
					"review and adjust compensation multipliers");
			}, null, null, null, {
				variety: pod.variety
			});
		},
		setLedger: function(pod) {
			comp.ledger.view(pod.pool,
				comp.generation.frame(null, "ledger"));
		},
		setUpdates: function(pod) {
			var _ = comp.pods._;
			CT.db.multi(pod.updates, function(ups) {
				new coop.Updates({
					parent: _.nodes.updates,
					subject: pod.name + " : ",
					shortSub: true,
					noNew: false,
					updates: ups.reverse(),
					on: {
						update: _.update
					},
					recipients: comp.core.members(pod.key).map(function(u) {
						return u.key;
					})
				});
			});
		},
		setResponsibilities: function(pod) {
			var _ = comp.pods._, rz = _.responsibilities,
				frame = comp.generation.frame(null, "responsibility", "responsibilities");
			if (rz[pod.key])
				return rz[pod.key].setParent(frame);
			rz[pod.key] = new coop.cal.Cal({
				parent: frame,
				tasks: pod.tasks,
				mode: core.config.ctcoop.cal.mode,
				on: {
					untask: function(task) {
						CT.data.remove(pod.tasks, task.key);
						comp.core.edit({
							key: pod.key,
							tasks: pod.tasks
						});
					},
					task: function(task) {
						pod.tasks.push(task.key);
						comp.core.edit({
							key: pod.key,
							tasks: pod.tasks
						});
					},
					editors: function(task) {
						comp.core.mates(pod.key,
							"who should be allowed to edit this task?",
							function(mz) {
								task.editors = task.editors.concat(mz.map(function(te) {
									return te.key;
								}));
								comp.core.edit({
									key: task.key,
									editors: task.editors
								});
							}, null, null, task.editors);
					}
				}
			});
		},
		setter: function(pod, stype, plur) {
			var obj = {};
			plur = plur || (stype + "s");
			CT.db.multi(pod[plur], function(data) {
				obj[plur] = data;
				comp.generation.frame(obj, stype, plur);
			});
		},
		blurb: function(pod) {
			if (pod.blurb)
				return CT.dom.div(pod.blurb);
			var container = CT.dom.div(CT.dom.smartField({
				isTA: true,
				noBreak: true,
				classname: "w1 h200p m5",
				blurs: ["how would you describe this pod?", "what's this pod all about?", "explain the pod, please"],
				cb: function(blurb) {
					pod.blurb = blurb;
					comp.core.edit({
						key: pod.key,
						blurb: blurb
					}, function() {
						CT.dom.setContent(container, pod.blurb);
					});
				}
			}));
			return container;
		}
	},
	acp: function() {
		var _ = comp.pods._, managed = function(agent) {
			_.pod({
				variety: "managed",
				agent: agent.key
			}, "the managed pod");
		}, apod = function() {
			_.pod({ variety: "software" }, "the agent pod", managed);
		}, az = _.current.pods.filter(p => p.variety == "software");
		az.length ? CT.modal.choice({
			prompt: "please select the agent pod",
			data: ["new agent pod"].concat(az),
			cb: function(agent) {
				(agent == "new agent pod") ? apod() : managed(agent);
			}
		}) : apod();
	},
	fresh: function() {
		var _ = comp.pods._, opts = {},
			ACP = "Agent/Client Pair (Managed Mode)";
		comp.core.varieties(function(variety) {
			if (variety == ACP)
				return comp.pods.acp();
			opts.variety = variety;
			if (variety == "support" || variety == "resource mapping")
				return _.pod(opts);
			comp.core.choice({
				prompt: "how would you like to admit new members? the default mode, 'full', requires every member to approve new admissions. with the alternative, 'limited', you may designate a subset of the pod's membership to make these decisions.",
				data: ["full", "limited"],
				cb: function(selection) {
					if (selection == "limited")
						opts.includers = [ user.core.get("key") ];
					_.pod(opts);
				}
			});
		}, ACP);
	},
	pod: function(pod) {
		var _ = comp.pods._, cfg = core.config.ctcomp,
			memship = comp.core.pod2memship(pod),
			inclz = CT.dom.div(), content,
			gen = comp.generation;
		_.current.pod = pod;
		["need", "offering", "board", "resource"].forEach(function(stype) {
			_.setter(pod, stype);
		});
		_.setter(pod, "dependency", "dependencies");
		gen.frame(pod, "library");
		comp.core.membership(memship.key, function(data) {
			gen.frame(data, "content");
			gen.frame(data, "product", "products");
		});
		comp.core.pod(pod.key, function(data) {
			content = [
				CT.dom.div("Info", "biggest"),
				cfg.blurbs.Info,
				CT.dom.br(),
				"variety: " + pod.variety,
				"members: " + data.memberships.length,
				CT.dom.br(),
				_.blurb(pod),
				CT.dom.br(),
				"Your membership key: " + memship.key
			];
			if (_.agents[pod.key]) {
				content = content.concat([
					"This pod's key: " + pod.key,
					CT.dom.br(),
					CT.dom.div("Managed Pods", "bigger"),
					_.agents[pod.key].map(function(p) {
						return p.name + ": " + p.key;
					})
				]);
			}
			if (pod.includers.includes(user.core.get("key"))) {
				CT.db.multi(pod.includers, function(iz) {
					CT.dom.setContent(inclz, iz.map(function(inc) {
						return inc.firstName;
					}));
				});
				content = content.concat([
					CT.dom.br(),
					"includers:",
					inclz
				]);
				if (pod.includers.length != comp.core.size(pod.key)) {
					content.push(CT.dom.button("add includer", function() {
						comp.core.mates(pod.key, "appoint your podmates to participate in determining whether to include others", function(pmz) {
							pod.includers = pod.includers.concat(pmz.map(function(pm) {
								return pm.key;
							}));
							comp.core.edit({
								key: pod.key,
								includers: pod.includers
							}, function() {
								CT.dom.setContent(inclz, pod.includers.map(function(pi) {
									return CT.data.get(pi).firstName;
								}));
							});
						}, null, null, pod.includers);
					}));
				}
			}
			CT.dom.setContent(_.nodes.info, content);
			["service", "commitment", "request", "codebase", "expense"].forEach(function(item) {
				gen.frame(data, item, item + "s");
			});
			_.setLedger(pod);
			_.setDrivers(pod);
			_.setUpdates(pod);
			_.setAdjustments(pod);
			_.setResponsibilities(pod);
			decide.core.util.proposals(_.nodes.proposals, data.proposals);
			_.restrictions();
		});
	},
	pods: function(pods) {
		var h = location.hash.slice(1), _ = comp.pods._,
			n = CT.panel.triggerList(pods, comp.pods.pod, _.nodes.list);
		pods.forEach(function(pod) {
			if (pod.agent) {
				if (!_.agents[pod.agent])
					_.agents[pod.agent] = [];
				_.agents[pod.agent].push(pod);
			} else if (pod.variety == "support" && pod.name == "conflict resolution")
				_.conres = pod;
		});
		_.current.pods = pods;
		if (h) location.hash = "";
		(h && CT.dom.id("tl" + h) || n.firstChild).firstChild.onclick();
		comp.live.chat(pods.map(function(pod) { return pod.name; }),
			_.nodes.main.parentNode);
	},
	memberships: function(memberships) {
		var _ = comp.pods._;
		CT.db.multi(memberships.map(function(m) {
			return m.pod;
		}), comp.pods.pods);
	},
	menu: function() {
		var _ = comp.pods._, cfg = core.config.ctcomp;
		CT.dom.setContent(_.nodes.right, [
			CT.dom.div([
				CT.dom.link("create new pod", comp.pods.fresh, null, "bold"),
				_.nodes.list
			], cfg.classes.menu),
			CT.dom.div([
				CT.dom.div("Views", "bold"),
				_.nodes.views
			], cfg.classes.menu)
		]);
		CT.dom.setContent(_.nodes.main, _.nodes.slider);
		CT.dom.setContent("ctmain", CT.dom.div([
			_.nodes.right,
			_.nodes.main
		], "abs all0"));
	},
	slider: function() {
		var _ = comp.pods._, nodes = _.nodes,
			slide = nodes.slider._slider = CT.panel.slider([],
				nodes.views, nodes.slider, null, null,
				null, true, core.config.ctcomp.blurbs);
		_.sections.forEach(function(section, i) {
			nodes[section.toLowerCase()] = slide.add(section, !i);
		});
	},
	limits: function(data) {
		var _ = comp.pods._, n = _.nodes.limits,
			lims = core.config.ctcomp.limits;
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