comp.submission = {
	submit: function(opts, stype, noteprompt, cb, ps) {
		var _ = comp.pods._, cp = _.current.pod;
		comp.core.submit(opts, cp, cb || function(ckey) {
			opts.key = ckey;
			comp.core.podup(cp.key, stype + "s", opts);
			CT.dom.addContent(_.nodes[stype + "_list"], _[stype](opts));
		}, stype, noteprompt, ps);
	},
	consub: function(identifier, memship, cb) {
		var _ = comp.pods._;
		comp.core.edit({
			modelName: "content",
			identifier: identifier,
			membership: memship.key
		}, function(content) {
			CT.data.add(content);
			CT.dom.addContent(_.nodes.content_list, _.content(content));
			cb && cb(content);
		});
	},
	submitter: function(stype) {
		var _ = comp.pods._, cfg = core.config, lims = cfg.ctcomp.limits,
			cur = _.current, pod = cur.pod, counts = cur.counts, plur, eoz,
			memship = comp.core.pod2memship(pod), u = user.core.get(),
			sub = comp.submission;
		return function() {
			if (stype == "need" || stype == "offering") {
				comp.core.prompt({
					isTA: true,
					prompt: cfg.ctcoop.needs.reflections[stype].prompt,
					cb: function(desc) {
						comp.core.tags(function(tagz) {
							comp.core.edit({
								modelName: stype,
								member: u.key,
								description: desc,
								tags: tagz.map(function(t) { return t.key; })
							}, function(res) {
								plur = stype + "s";
								eoz = { key: pod.key };
								pod[plur].push(res.key);
								eoz[plur] = pod[plur];
								comp.core.edit(eoz, function() {
									CT.data.add(res);
									CT.dom.addContent(_.nodes[stype + "_list"],
										_[stype](res));
								});
							});
						});
					}
				});
			} else if (stype == "adjustment") {
				comp.core.adjustment(function(adjustment) {
					CT.dom.addContent(_.nodes.adjustment_list,
						_.adjustment(adjustment));
				}, pod.variety);
			} else if (stype == "resource") {
				comp.core.prompt({
					style: "form",
					prompt: "map resource editor",
					className: "basicpopup mosthigh w400p",
					data: comp.forms.resource,
					cb: function(vals) {
						vals.zipcode = CT.parse.stripToZip(vals.zipcode);
						if (!vals.zipcode)
							return alert("that doesn't look like a zipcode!");
						comp.core.prompt({
							style: "icon",
							prompt: "please select an icon",
							data: core.config.ctmap.icons.map(function(t) {
								return "/img/map/" + t + ".png";
							}),
							cb: function(val) {
								vals.icon = val;
								comp.core.tags(function(tagz) {
									vals.tags = tagz.map(function(t) {
										return t.key;
									});
									comp.core.edit(CT.merge(vals, {
										modelName: "resource",
										editors: [u.key]
									}), function(res) {
										pod.resources.push(res.key);
										comp.core.edit({
											key: pod.key,
											resources: pod.resources
										}, function() {
											CT.data.add(res);
											CT.dom.addContent(_.nodes.resource_list,
												_.resource(res));
										});
									});
								});
							}
						});
					}
				});
			} else if (stype == "library") {
				comp.library.item(function(res) {
					sub.consub(res.modelName + ": " + res.name, memship, function(cont) {
						res.content = cont.key;
						comp.core.edit({
							key: res.key,
							content: res.content
						}, function() {
							pod.library.push(res.key);
							comp.core.edit({
								key: pod.key,
								library: pod.library
							}, function() {
								CT.data.add(res);
								CT.dom.addContent(_.nodes.library_list, _.library(res.key));
							});
						});
					});
				});
			} else if (stype == "dependency") {
				comp.core.choice({
					prompt: "what kind of dependency?",
					data: ["framework", "service"],
					cb: function(variety) {
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
						}, variety);
					}
				});
			} else if (stype == "codebase") {
				if (!u.contributors.length)
					return alert("first, go to the settings page to register your github account!");
				CT.db.multi(u.contributors, function(uconts) {
					comp.core.choice({
						data: ["platform", "framework", "service", "research and development"],
						cb: function(variety) {
							var handlez = [];
							uconts.forEach(function(ucont) {
								handlez = handlez.concat(CT.net.get("https://api.github.com/users/"
									+ ucont.handle + "/repos", null, true));
							});
							comp.core.choice({
								data: handlez.filter(function(repo) {
									return !(repo.name in _.codebases);
								}),
								cb: function(project) {
									comp.core.edit({
										modelName: "codebase",
										pod: pod.key,
										owner: project.owner.login,
										repo: project.name,
										variety: variety
									}, function(cbase) {
										CT.data.add(cbase);
										CT.dom.addContent(_.nodes.codebase_list,
											_.codebase(cbase));
									});
								}
							});
						}
					});
				});
			} else if (stype == "board") {
				comp.core.prompt({
					prompt: "what is this board's name?",
					cb: function(name) {
						comp.core.prompt({
							isTA: true,
							prompt: "please describe",
							cb: function(description) {
								comp.core.choice({
									prompt: "should this board be anonymous?",
									data: ["yes", "no"],
									cb: function(anonswer) {
										comp.core.tags(function(tags) {
											comp.core.edit({
												modelName: "board",
												name: name,
												description: description,
												anonymous: (anonswer == "yes"),
												tags: tags.map(function(t) {
													return t.key;
												})
											}, function(board) {
												CT.data.add(board);
												pod.boards.push(board.key);
												comp.core.edit({
													key: pod.key,
													boards: pod.boards
												}, function() {
													CT.dom.addContent(_.nodes.board_list,
														_.board(board));
												});
											});
										});
									}
								});
							}
						});
					}
				});
			} else if (stype == "content") {
				comp.core.prompt({
					prompt: "enter a descriptor for this content item (url, for instance)",
					cb: function(identifier) {
						sub.consub(identifier, memship);
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
									isTA: true,
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
													comp.library.media(prod, "image", function() {
														memship.products.push(prod.key);
														comp.core.edit({
															key: memship.key,
															products: memship.products
														}, function() {
															CT.dom.addContent(_.nodes.product_list, _.product(prod));
														});
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
						sub.submit({
							variety: "dividend",
							recurring: false,
							amount: percentage / 100
						}, stype);
					}
				});
			} else if (stype == "commitment") {
				comp.core.services(function(service) {
					_.estimate(function(estimate) {
						sub.submit({
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
							sub.submit({
								service: service.key,
								workers: workers.map(function(w) { return w.key; }),
								beneficiaries: bennies.map(function(b) { return b.key; })
							}, stype);
						});
					});
				}, pod.variety);
			} else if (stype == "request") {
				if (comp.core.size(pod.key) > 1) {
					var reqmodes = ["conversation", "blurb", "include", "exclude"];
					if (pod.variety == "care work")
						reqmodes.unshift("delivery");
					comp.core.choice({
						data: reqmodes,
						cb: _.change
					});
				} else
					_.change("include");
			}
		};
	},
	change: function(change) {
		var _ = comp.pods._, pod = _.current.pod, sub = comp.submission;
		if (change == "include") {
			comp.core.prompt({
				prompt: "what's this person's email address?",
				cb: function(email) {
					email = email.toLowerCase();
					if (!CT.parse.validEmail(email))
						return alert("that's not an email address!");
					CT.db.get("person", function(peeps) {
						var person = peeps[0];
						if (!person) {
							sub.submit({
								email: email
							}, "invite", null, function() {
								alert("your friend isn't in our system yet -- we sent them an invitation!");
							});
						} else {
							sub.submit({
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
			comp.core.mates(pod.key, "kick out whom?", function(person) {
				sub.submit({
					person: person.key,
					change: change
				}, "request");
			}, "single-choice");
		} else if (change == "blurb")
			sub.submit({ change: change }, "request", "ok, what's the new blurb?");
		else if (change == "delivery") {
			if (pod.resources.length < 2)
				return alert("please register at least two Resource locations in the Resource view");
			if (!pod.drivers.length)
				return alert("oops! no one in the pod is registered as a driver yet :(");
			CT.require("map.init", true);
			comp.core.resource(pod, function(pickup) {
				comp.core.resource(pod, function(dropoff) {
					CT.map.util.distance(pickup.address, dropoff.address, function(dist) {
						sub.submit({
							change: change,
						}, "request", null, null, [
							"Pickup: " + pickup.name,
							pickup.address,
							"Dropoff: " + dropoff.name,
							dropoff.address,
							"Miles: " + dist
						].join("\n\n"));
					});
				}, "drop off");
			}, "pickup");
		} else { // conversation
			comp.core.choice({
				prompt: "request facilitator from conflict resolution pod?",
				data: ["no", "yes"],
				cb: function(answer) {
					if (answer == "yes") {
						comp.core.facilitator(_.conres, function(facilitator) {
							sub.submit({
								person: facilitator.key,
								change: change
							}, "request", "what would you like to discuss? also, when?");
						});
					} else {
						sub.submit({
							change: change
						}, "request", "what would you like to discuss? also, when?");
					}
				}
			});
		}
	}
};