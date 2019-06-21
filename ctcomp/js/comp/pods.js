comp.pods = {
	_: {
		current: {},
		agents: {},
		memberships: {},
		nodes: {
			list: CT.dom.div(),
			views: CT.dom.div(),
			limits: CT.dom.div(null, "abs cbl"),
			slider: CT.dom.div(null, null, "slider"),
			main: CT.dom.div(null, "h1 mr160 relative"),
			right: CT.dom.div(null, "h1 w160p up5 scrolly right")
		},
		sections: ["Info", "Proposals", "Commitments", "Services", "Requests",
			"Content", "Codebases", "Dependencies", "Expenses"],
		proposal: function(key) {
			var _ = comp.pods._,
				memship = _.memberships[_.current.pod.key];
			memship.proposals.push(key);
			comp.core.edit({
				key: memship.key,
				proposals: memship.proposals
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
				CT.dom.div("submitted by: " + comp.pods._.name(CT.data.get(c.membership).person), "right"),
				CT.dom.div(c.identifier, "big"),
				CT.dom.link("manual link - probs unnecessary", function() {
					comp.core.modal({
						content: [
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
						]
					});
				}, null, "centered block")
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
				memship = _.memberships[_.current.pod.key],
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
		submit: function(opts, stype, noteprompt) {
			var _ = comp.pods._, pkey = _.current.pod.key;
			opts.membership = _.memberships[pkey].key;
			comp.core.prompt({
				prompt: noteprompt || "any notes?",
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
			var _ = comp.pods._, lims = core.config.ctcomp.limits,
				cur = _.current, pod = cur.pod, counts = cur.counts, diff, u;
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
								membership: _.memberships[pod.key].key
							}, function(content) {
								CT.data.add(content);
								CT.dom.addContent(_.nodes.content_list, _.content(content));
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
							data: ["include", "exclude", "conversation"],
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
			} else if (change == "exclude") { // exclude
				comp.core.mates(_.current.pod.key, "kick out whom?", function(person) {
					_.submit({
						person: person.key,
						change: change
					}, "request");
				}, "single-choice");
			} else { // conversation
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
			["Requests", "Commitments", "Services"].forEach(function(section, i) {
				CT.dom[i ? action : reaction]("tl" + section);
			});
			["Codebases", "Dependencies"].forEach(function(section) {
				CT.dom[showSoft]("tl" + section);
			});
			unrestricted || CT.dom.id("tlInfo").firstChild.onclick();
		},
		frame: function(data, item, plur) {
			var _ = comp.pods._, cfg = core.config.ctcomp;
			plur = plur || item;
				n = _.nodes[item + "_list"] = CT.dom.div(data[plur].map(_[item]));
			CT.dom.setContent(_.nodes[plur], [
				CT.dom.button("new", _.submitter(item), "right"),
				CT.dom.div(CT.parse.capitalize(plur), "biggest"),
				cfg.blurbs[item],
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
		},
		setDependencies: function(pod) {
			CT.db.multi(pod.dependencies, function(deps) {
				comp.pods._.frame({ dependencies: deps }, "dependency", "dependencies");
			});
		},
		video: function(podname, ukey) {
			var vbutt = CT.dom.button("Video Chat"),
				cname = ukey ? CT.chat.privateChatName(ukey, user.core.get("key")) : podname.replace(/ /g, "");
			vbutt.onclick = function() {
		        vbutt._modal = vbutt._modal || new CT.modal.Modal({
		            center: false,
		            innerClass: "w1 h1 noflow",
		            className: "vslide mosthigh fixed noflow",
		            transition: "slide",
		            slide: {
		                origin: "bottomleft"
		            },
		            content: CT.dom.iframe("https://fzn.party/stream/widget.html#" + cname + "_zoom",
		            	"w1 h1", null, { allow: "microphone; camera" })
		        });
		        vbutt._modal.showHide();
			};
			return [
				CT.dom.span(podname),
				CT.dom.pad(),
				vbutt
			];
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
		var _ = comp.pods._, cfg = core.config.ctcomp,
			memship = _.memberships[pod.key], content;
		_.current.pod = pod;
		_.setDependencies(pod);
		comp.core.membership(memship.key, function(data) {
			_.frame(data, "content");
		});
		comp.core.pod(pod.key, function(data) {
			content = [
				CT.dom.div("Info", "biggest"),
				cfg.blurbs.info,
				CT.dom.br(),
				"variety: " + pod.variety,
				"members: " + data.memberships.length,
				CT.dom.br(),
				"[TODO: add TOC]",
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
			CT.dom.setContent(_.nodes.info, content);
			["service", "commitment", "request", "codebase", "expense"].forEach(function(item) {
				_.frame(data, item, item + "s");
			});
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
		comp.pods.chat(pods.map(function(pod) { return pod.name; }));
	},
	chat: function(channels) {
		var _ = comp.pods._, u = user.core.get(), doit = function() {
			CT.dom.addContent(_.nodes.main.parentNode, CT.chat.widget(u.key, channels, "Pods", _.video));
		};
		if (u.chat)
			return doit();
		var enabler = CT.dom.link("enable chat", function() {
			CT.dom.remove(enabler);
			doit();
		}, null, "abs r0 b0 big bold above");
		CT.dom.addContent(_.nodes.main.parentNode, enabler);
	},
	memberships: function(memberships) {
		var _ = comp.pods._;
		CT.db.multi(memberships.map(function(m) {
			_.memberships[m.pod] = m;
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
		var _ = comp.pods._, nodes = _.nodes;
		nodes.slider._slider = CT.panel.slider([], nodes.views,
			nodes.slider, null, null, null, true);
		_.sections.forEach(function(section, i) {
			nodes[section.toLowerCase()] = nodes.slider._slider.add(section, !i);
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