comp.core = {
	_: { pods: {}, memships: {} },
	c: function(opts, cb) {
		CT.net.post({
			path: "/_comp",
			params: opts,
			cb: cb
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
	person: function(pkey, cb) {
		var _ = comp.core._;
		if (_.person)
			return cb(_.person);
		comp.core.c({
			action: "person",
			person: pkey
		}, function(data) {
			CT.data.addSet(data.memberships);
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
	modal: function(opts) {
		(new CT.modal.Modal(CT.merge(opts, {
			transition: "slide"
		}))).show();
	},
	prompt: function(opts) {
		(new CT.modal.Prompt(CT.merge(opts, {
			noClose: true,
			transition: "slide"
		}))).show();
	},
	choice: function(opts) {
		comp.core.prompt(CT.merge(opts, {
			defaultIndex: 0,
			style: "single-choice"
		}));
	},
	size: function(pod) {
		return comp.core._.pods[pod].people.length;
	},
	others: function(pod) {
		var u = user.core.get("key");
		return comp.core._.pods[pod].people.filter(function(p) {
			return p.key != u;
		});
	},
	mates: function(pod, prompt, cb, style, nome) {
		comp.core.choice({
			cb: cb,
			prompt: prompt,
			style: style || "multiple-choice",
			data: nome && comp.core.others(pod) || comp.core._.pods[pod].people
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
	frameworks: function(cb) {
		var _ = comp.core._;
		if (_.frameworks)
			return cb(_.frameworks);
		CT.db.get("codebase", function(frameworks) {
			_.frameworks = frameworks;
			cb(frameworks);
		}, null, null, null, {
			variety: "framework"
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
	services: function(cb, variety) {
		comp.core.choice({
			prompt: "select a service",
			data: ["New Service"].concat(comp.core._.services[variety]),
			cb: function(service) {
				if (service == "New Service") {
					comp.core.prompt({
						prompt: "what's the service called?",
						cb: function(name) {
							comp.core.service(name, variety, cb);
						}
					});
				} else
					cb(service);
			}
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
	init: function() {
		var _ = comp.core._;
		CT.db.get("service", function(services) {
			CT.data.addSet(services);
			_.services = {};
			services.forEach(function(service) {
				_.services[service.variety] = _.services[service.variety] || [];
				_.services[service.variety].push(service);
			});
			_.varieties = Object.keys(_.services);
		});
	}
};