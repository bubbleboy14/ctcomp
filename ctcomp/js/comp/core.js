comp.core = {
	_: {
		pods: {},
		memships: {},
		p2m: {},
		deps: {},
		chat: function(person) {
			CT.db.multi(person.memberships.map(function(m) {
				return m.pod;
			}), function(pods) {
				comp.live.chat(pods.map(function(p) {
					return p.name;
				}));
			});
		}
	},
	c: function(opts, cb, eb) {
		CT.net.post({
			path: "/_comp",
			params: opts,
			cb: cb,
			eb: eb
		});
	},
	edit: function(data, cb) {
		CT.net.post({
			path: "/_db",
			params: {
				data: data,
				action: "edit",
				pw: core.config.keys.storage
			},
			cb: cb
		});
	},
	chat: function(person) {
		CT.require("comp.live", true);
		if (person)
			comp.core._.chat(person);
		else
			comp.core.person(user.core.get("key"), comp.core._.chat);
	},
	submit: function(opts, pod, cb, stype, noteprompt, ps) {
		opts.membership = comp.core.pod2memship(pod).key;
		comp.core.prompt({
			prompt: noteprompt || "any notes?",
			isTA: true,
			cb: function(notes) {
				opts.notes = notes;
				if (ps)
					opts.notes += "\n\n" + ps;
				comp.core.c(CT.merge(opts, {
					action: stype || "request"
				}), cb || function() {
					alert("ok, check your email!");
				});
			}
		});
	},
	library: function(pkey) {
		var n = CT.dom.div(), tz = [];
		CT.db.one(pkey, function(pod) {
			CT.db.multi(pod.library, function(items) {
				items.forEach(function(item) {
					tz = tz.concat(item.tags);
				});
				CT.db.multi(tz, function() {
					CT.dom.setContent(n, comp.library.slider(items));
				});
			});
		});
		n.style.flex = "1";
		return n;
	},
	support: function(pkey) {
		return CT.dom.button("request support", function() {
			comp.core.pod(pkey, function() {
				comp.core.mates(pkey, "please select a pod mate",
					function(mate) {
						comp.core.submit({
							person: mate.key,
							change: "support"
						}, CT.data.get(pkey));
					}, "single-choice", true);
			});
		}); // TODO: list public support requests!!
	},
	membership: function(memship, cb) {
		var _ = comp.core._;
		if (_.memships[memship])
			return cb(_.memships[memship]);
		comp.core.c({
			action: "membership",
			membership: memship
		}, function(data) {
			for (var k in data)
				CT.data.addSet(data[k]);
			_.memships[memship] = data;
			cb(data);
		});
	},
	pod2memship: function(pod) {
		return comp.core._.p2m[pod.key];
	},
	person: function(pkey, cb) {
		var _ = comp.core._;
		if (_.person)
			return cb(_.person);
		comp.core.c({
			action: "person",
			person: pkey
		}, function(data) {
			CT.data.addSet(data.memberships);
			data.memberships.forEach(function(m) {
				_.p2m[m.pod] = m;
			});
			_.person = data;
			cb(data);
		});
	},
	pod: function(pod, cb) {
		var _ = comp.core._;
		if (_.pods[pod])
			return cb(_.pods[pod]);
		comp.core.c({
			action: "pod",
			pod: pod
		}, function(data) {
			for (var k in data)
				CT.data.addSet(data[k]);
			_.pods[pod] = data;
			cb(data);
		});
	},
	podup: function(pod, section, data) {
		CT.data.add(data);
		comp.core._.pods[pod][section].push(data);
	},
	prompt: function(opts) {
		CT.modal.prompt(CT.merge(opts, {
			noClose: true
		}));
	},
	choice: function(opts) {
		comp.core.prompt(CT.merge(opts, {
			defaultIndex: 0,
			style: "single-choice"
		}));
	},
	members: function(pod) {
		return comp.core._.pods[pod].people;
	},
	size: function(pod) {
		return comp.core.members(pod).length;
	},
	others: function(pod) {
		var u = user.core.get("key");
		return comp.core.members(pod).filter(function(p) {
			return p.key != u;
		});
	},
	mates: function(pod, prompt, cb, style, nome, exclude) {
		var data = comp.core[nome ? "others" : "members"](pod);
		if (exclude) {
			data = data.filter(function(d) {
				return !exclude.includes(d.key);
			});
		}
		comp.core.choice({
			cb: cb,
			prompt: prompt,
			style: style || "multiple-choice",
			data: data
		})
	},
	facilitator: function(pod, cb) {
		if (!pod) {
			if (confirm("proceed to support page to join conflict resolution pod?"))
				location = "/comp/support.html";
			return;
		}
		comp.core.choice({
			prompt: "would you like someone in particular, or someone random?",
			data: ["random", "choice"],
			cb: function(which) {
				if (which == "random")
					cb(CT.data.random(comp.core.others(pod.key)));
				else // choice
					comp.core.mates(pod.key, "please select a facilitator",
						cb, "single-choice", true);
			}
		});
	},
	dchoice: function(options, codebase, cb) {
		var opts = options.filter(function(opt) {
			return (opt.key != codebase.key) && (codebase.dependencies.indexOf(opt.key) == -1);
		});
		if (!opts.length)
			return alert("no options! better register some more codebases :)");
		comp.core.choice({
			style: "multiple-choice",
			data: opts,
			cb: cb
		});
	},
	frameworks: function(cb, variety) {
		var dz = comp.core._.deps;
		variety = variety || "framework";
		if (dz[variety])
			return cb(dz[variety]);
		CT.db.get("codebase", function(frameworks) {
			dz[variety] = frameworks;
			cb(frameworks);
		}, null, null, null, {
			variety: variety
		});
	},
	dependencies: function(codebase, cb) {
		var _ = comp.core._, selected = function(selections) {
			codebase.dependencies = codebase.dependencies.concat(selections.map(function(s) {
				return s.key;
			}));
			cb();
		};
		if (_.codebases)
			return comp.core.dchoice(_.codebases, codebase, selected);
		CT.db.get("codebase", function(codebases) {
			CT.data.addSet(codebases);
			_.codebases = codebases;
			comp.core.dchoice(codebases, codebase, selected);
		});
	},
	service: function(name, variety, cb) {
		comp.core.edit({
			modelName: "service",
			variety: variety,
			name: name
		}, function(data) {
			comp.core._.services[variety].push(data);
			CT.data.add(data);
			cb(data);
		});
	},
	whatservice: function(cb, variety) {
		comp.core.prompt({
			prompt: "what's the service called?",
			cb: function(name) {
				comp.core.service(name, variety, cb);
			}
		});
	},
	services: function(cb, variety) {
		comp.core.choice({
			prompt: "select a service",
			data: ["New Service"].concat(comp.core._.services[variety]),
			cb: function(service) {
				if (service == "New Service")
					comp.core.whatservice(cb, variety);
				else
					cb(service);
			}
		});
	},
	adjustment: function(cb, variety) {
		comp.core.choice({
			prompt: "would you like to adjust any of these compensation multipliers?",
			data: ["New Service"].concat(comp.core._.services[variety].map(function(s) {
				return {
					name: s.name + " (" + s.compensation + ")",
					service: s.name,
					compensation: s.compensation
				};
			})),
			cb: function(service) {
				if (service == "New Service") {
					return comp.core.whatservice(function(service) {
						comp.core.adjustment(cb, variety);
					}, variety);
				}
				comp.core.prompt({
					prompt: "current compensation: " + service.compensation + ". what do you think it should be?",
					style: "number",
					max: 2,
					min: 0.5,
					step: 0.1,
					initial: service.compensation,
					cb: function(compensation) {
						comp.core.prompt({
							prompt: "please explain your rationale",
							isTA: true,
							cb: function(description) {
								comp.core.edit({
									modelName: "adjustment",
									user: user.core.get("key"),
									compensation: compensation,
									description: description,
									name: service.service,
									variety: variety,
								}, cb);
							}
						})
					}
				});
			}
		});
	},
	tag: function(name, cb) {
		comp.core.edit({
			modelName: "tag",
			name: name
		}, function(data) {
			comp.core._.tags.push(data);
			CT.data.add(data);
			cb(data);
		});
	},
	tags: function(cb) {
		comp.core.choice({
			prompt: "select resource tags",
			style: "multiple-choice",
			data: ["New Resource Tag"].concat(comp.core._.tags),
			cb: function(tags) {
				if (tags[0] == "New Resource Tag") {
					comp.core.prompt({
						prompt: "what's the tag?",
						cb: function(name) {
							comp.core.tag(name, function(tag) {
								comp.core.tags(cb);
							});
						}
					});
				} else
					cb(tags);
			}
		});
	},
	resource: function(pod, cb, desc) {
		CT.db.multi(pod.resources, function(rez) {
			comp.core.choice({
				prompt: "please select the " + desc + " location",
				data: rez,
				cb: cb
			});
		});
	},
	varieties: function(cb, ACP) {
		var _ = comp.core._;
		comp.core.choice({
			prompt: "select a variety",
			data: ["New Variety"].concat(_.varieties).concat([ACP]),
			cb: function(variety) {
				if (variety == "New Variety") {
					comp.core.prompt({
						prompt: "what's the new pod variety called?",
						cb: function(vname) {
							comp.core.prompt({
								prompt: "ok, what's an example service of this variety?",
								cb: function(sname) {
									comp.core.service(sname, vname, function(service) {
										_.varieties.push(vname);
										cb(vname);
									});
								}
							});
						}
					});
				} else
					cb(variety);
			}
		});
	},
	mypods: function(cb, full) {
		comp.core.person(user.core.get("key"), function(person) {
			CT.db.multi(person.memberships.map(function(m) {
				return m.pod;
			}), function(pods) {
				cb(full ? pods : pods.map(function(pod) {
					return pod.name;
				}));
			});
		});
	},
	initTags: function() {
		CT.db.get("tag", function(tags) {
			comp.core._.tags = tags;
		});
	},
	init: function() {
		var _ = comp.core._;
		CT.db.get("service", function(services) {
			_.services = {};
			services.forEach(function(service) {
				_.services[service.variety] = _.services[service.variety] || [];
				_.services[service.variety].push(service);
			});
			_.varieties = Object.keys(_.services);
		});
		comp.core.initTags();
	}
};