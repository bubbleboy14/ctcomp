comp.pods = {
	_: {
		current: {},
		agents: {},
		responsibilities: {},
		nodes: {
			list: CT.dom.div(),
			views: CT.dom.div(),
			limits: CT.dom.div(null, "abs cbl"),
			slider: CT.dom.div(null, null, "slider"),
			main: CT.dom.div(null, "h1 mr160 relative"),
			right: CT.dom.div(null, "h1 w160p up5 scrolly right")
		},
		sections: ["Info", "Updates", "Proposals", "Responsibilities",
			"Commitments", "Services", "Requests", "Content",
			"Products", "Codebases", "Dependencies", "Expenses"],
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
		name: function(pkey) {
			var person = CT.data.get(pkey), n = person.firstName;
			if (person.lastName)
				n += " " + person.lastName;
			return n;
		},
		item: function(header, data, extras) {
			return CT.dom.div([
				CT.dom.div("submitted by: " + comp.pods._.name(CT.data.get(data.membership).person), "right"),
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
		dependency: function(d) {
			return CT.dom.div(d.repo, "bordered padded margined round inline-block");
		},
		content: function(c) {
			return CT.dom.div([
				CT.dom.div(c.identifier, "big"),
				CT.dom.link("manual link - probs unnecessary", function() {
					CT.modal.modal([
						CT.dom.div("Manual Linking - Probably Not Necessary", "bigger underline"),
						[
							"To manually link this content, add <b>&lt;iframe src='",
							location.protocol,
							"//",
							location.host,
							"/comp/view.html#",
							c.key,
							"'&gt;&lt;/iframe&gt;</b> to your web page."
						].join(""),
						CT.dom.br(),
						"Unless you're crafting your site by hand (without the CC API), this is almost certainly not necessary."
					]);
				}, null, "centered block")
			], "bordered padded margined");
		},
		product: function(p) {
			return CT.dom.div([
				CT.dom.img(p.image, "right wm1-2 hm400p"),
				CT.dom.div(p.variety, "right italic ph10"),
				CT.dom.div(p.name, "big"),
				CT.dom.div(p.price + " carecoins", "bold"),
				p.description,
				CT.dom.div(null, "clearnode")
			], "bordered padded margined");
		},
		expense: function(e) {
			return comp.pods._.item(e.variety + " - " + (e.amount * 100) + "%", e,
				e.executor && ("executor: " + comp.pods._.name(e.executor)));
		},
		service: function(a) { // act
			return comp.pods._.item(CT.data.get(a.service).name, a);
		},
		request: function(r) {
			return comp.pods._.item(r.change + " " + comp.pods._.name(r.person), r);
		},
		commitment: function(c) {
			var _ = comp.pods._, n = CT.dom.div(),
				memship = comp.core.pod2memship(_.current.pod),
				ismem = c.membership == memship.key;
			n.adjust = function() {
				_.estimate(function(estimate) {
					comp.core.edit({
						key: c.key,
						estimate: estimate
					});
					if (c.passed && (estimate > c.estimate)) { // requires reapproval
						comp.core.c({
							action: "unverify",
							verifiable: c.key
						});
						c.passed = false;
					}
					c.estimate = estimate;
					n.update();
				}, c.estimate);
			};
			n.update = function() {
				var extras = [c.estimate + " hours per week"];
				if (ismem) {
					extras.push(CT.dom.button("adjust", n.adjust));
				}
				CT.dom.setContent(n, comp.pods._.item(CT.data.get(c.service).name, c, extras));
			};
			n.update();
			return n;
		},
		estimate: function(cb, curval) {
			curval = curval || 0;
			var _ = comp.pods._, cfg = core.config.ctcomp,
				lims = cfg.limits, cur = _.current, counts = cur.counts,
				diff = lims.commitments - counts.commitments - curval;
			if (!diff)
				return alert("you're already committed to the max! scale back something else and try again ;)");
			comp.core.prompt({
				prompt: "how many hours per week?",
				style: "number",
				max: Math.min(5, diff),
				initial: curval || Math.min(1, diff),
				cb: function(estimate) {
					counts.commitments += estimate - curval;
					_.nodes.limits.update();
					cb(estimate);
				}
			});
		},
		submit: function(opts, stype, noteprompt, cb) {
			var _ = comp.pods._, cp = _.current.pod;
			comp.core.submit(opts, cp, cb || function(ckey) {
				opts.key = ckey;
				comp.core.podup(cp.key, stype + "s", opts);
				CT.dom.addContent(_.nodes[stype + "_list"], _[stype](opts));
			}, stype, noteprompt);
		},
		submitter: function(stype) {
			var _ = comp.pods._, lims = core.config.ctcomp.limits,
				cur = _.current, pod = cur.pod, counts = cur.counts,
				memship = comp.core.pod2memship(pod), diff, u;
			return function() {
				if (stype == "dependency") {
					comp.core.frameworks(function(allfms) {
						comp.core.choice({
							style: "multiple-choice",
							data: allfms.filter(function(f) { return pod.dependencies.indexOf(f.key) == -1 }),
							cb: function(frameworks) {
								pod.dependencies = pod.dependencies.concat(frameworks.map(function(fw) { return fw.key; }));
								comp.core.edit({
									key: pod.key,
									dependencies: pod.dependencies
								}, function() {
									_.setDependencies(pod);
								});
							}
						});
					});
				} else if (stype == "codebase") {
					u = user.core.get();
					if (!u.contributor)
						return alert("first, go to the settings page to register your github account!");
					CT.db.one(u.contributor, function(ucont) {
						comp.core.choice({
							data: ["platform", "framework", "research and development"],
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
								membership: memship.key
							}, function(content) {
								CT.data.add(content);
								CT.dom.addContent(_.nodes.content_list, _.content(content));
							});
						}
					});
				} else if (stype == "product") {
					comp.core.choice({
						prompt: "what type of thing is it?",
						data: ["object", "consultation", "donation"],
						cb: function(variety) {
							comp.core.prompt({
								prompt: "what's it called?",
								cb: function(name) {
									comp.core.prompt({
										prompt: "please describe",
										cb: function(description) {
											comp.core.prompt({
												prompt: "how much does it cost?",
												style: "number",
												max: 20,
												min: 0.1,
												step: 0.1,
												initial: 1,
												cb: function(price) {
													comp.core.edit({
														modelName: "product",
														name: name,
														variety: variety,
														description: description,
														price: price
													}, function(prod) {
														comp.core.prompt({
															prompt: "please select an image",
															style: "file",
															cb: function(ctfile) {
																ctfile.upload("/_db", function(url) {
																	prod.image = url;
																	CT.data.add(prod);
																	memship.products.push(prod.key);
																	comp.core.edit({
																		key: memship.key,
																		products: memship.products
																	}, function() {
																		CT.dom.addContent(_.nodes.product_list, _.product(prod));
																	});
																}, {
																	action: "blob",
																	key: prod.key,
																	property: "image"
																});
															}
														});
													});
												}
											});
										}
									});
								}
							});
						}
					});
				} else if (stype == "expense") {
					comp.core.prompt({
						prompt: "what percentage should be distributed?",
						style: "number",
						max: 100,
						min: 1,
						step: 1,
						initial: 10,
						cb: function(percentage) {
							_.submit({
								variety: "dividend",
								recurring: false,
								amount: percentage / 100
							}, stype);
						}
					});
				} else if (stype == "commitment") {
					comp.core.services(function(service) {
						_.estimate(function(estimate) {
							_.submit({
								service: service.key,
								estimate: estimate
							}, stype);
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
							data: ["include", "exclude", "blurb", "conversation"],
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
							if (!person) {
								_.submit({
									email: email
								}, "invite", null, function() {
									alert("your friend isn't in our system yet -- we sent them an invitation!");
								});
							} else {
								_.submit({
									person: person.key,
									change: change
								}, "request");
							}
						}, 1, 0, null, {
							email: email
						});
					}
				});
			} else if (change == "exclude") { // exclude
				comp.core.mates(_.current.pod.key, "kick out whom?", function(person) {
					_.submit({
						person: person.key,
						change: change
					}, "request");
				}, "single-choice");
			} else if (change == "blurb")
				_.submit({ change: change }, "request", "ok, what's the new blurb?");
			else { // conversation
				comp.core.choice({
					prompt: "request facilitator from conflict resolution pod?",
					data: ["no", "yes"],
					cb: function(answer) {
						if (answer == "yes") {
							comp.core.facilitator(_.conres, function(facilitator) {
								_.submit({
									person: facilitator.key,
									change: change
								}, "request", "what would you like to discuss? also, when?");
							});
						} else {
							_.submit({
								change: change
							}, "request", "what would you like to discuss? also, when?");
						}
					}
				});
			}
		},
		restrictions: function() {
			var pod = comp.pods._.current.pod,
				size = comp.core.size(pod.key),
				unrestricted = !pod.agent && (size > 1),
				action = unrestricted ? "show" : "hide",
				reaction = pod.agent ? "hide" : "show",
				showSoft = (pod.variety == "software") ? "show" : "hide";
			["Updates", "Commitments", "Services"].forEach(function(section) {
				CT.dom[action]("tl" + section);
			});
			["Requests", "Responsibilities"].forEach(function(section) {
				CT.dom[reaction]("tl" + section);
			});
			["Codebases", "Dependencies"].forEach(function(section) {
				CT.dom[showSoft]("tl" + section);
			});
			unrestricted || CT.dom.id("tlInfo").firstChild.onclick();
		},
		frame: function(data, item, plur) {
			var _ = comp.pods._, cfg = core.config.ctcomp, n, content;
			plur = plur || item;
			n = _.nodes[item + "_list"] = CT.dom.div(data && data[plur].map(_[item]));
			content = [
				CT.dom.div(CT.parse.capitalize(plur), "biggest"),
				cfg.blurbs[CT.parse.capitalize(plur)],
				n
			];
			data && content.unshift(CT.dom.button("new",
				_.submitter(item), "right"));
			CT.dom.setContent(_.nodes[plur], content);
			return n;
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
		setDependencies: function(pod) {
			CT.db.multi(pod.dependencies, function(deps) {
				comp.pods._.frame({ dependencies: deps }, "dependency", "dependencies");
			});
		},
		setResponsibilities: function(pod) {
			var _ = comp.pods._, rz = _.responsibilities,
				frame = _.frame(null, "responsibility", "responsibilities");
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
	fresh: function() {
		var _ = comp.pods._, opts = {},
			ACP = "Agent/Client Pair (Managed Mode)";
		comp.core.varieties(function(variety) {
			if (variety == ACP) {
				_.pod({ variety: "software" }, "the agent pod", function(agent) {
					_.pod({
						variety: "managed",
						agent: agent.key
					}, "the managed pod");
				});
			} else {
				opts.variety = variety;
				if (variety == "support")
					return _.pod(opts);
				comp.core.choice({
					prompt: "how would you like to admit new members? the default mode, 'full', requires every member to approve new admissions. with the alternative, 'limited', you may designate a subset of the pod's membership to make these decisions.",
					data: ["full", "limited"],
					cb: function(selection) {
						if (selection == "limited")
							opts.includers = [ user.core.get("key") ];
						_.pod(opts);
					}
				})
			}
		}, ACP);
	},
	pod: function(pod) {
		var _ = comp.pods._, cfg = core.config.ctcomp,
			memship = comp.core.pod2memship(pod),
			inclz = CT.dom.div(), content;
		_.current.pod = pod;
		_.setDependencies(pod);
		_.setResponsibilities(pod);
		comp.core.membership(memship.key, function(data) {
			_.frame(data, "content");
			_.frame(data, "product", "products");
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
				_.frame(data, item, item + "s");
			});
			_.setUpdates(pod);
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