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
	prompt: function(opts) {
		(new CT.modal.Prompt(CT.merge(opts, {
			transition: "slide"
		}))).show();
	},
	choice: function(opts) {
		comp.core.prompt(CT.merge(opts, {
			noClose: true,
			defaultIndex: 0,
			style: "single-choice"
		}));
	},
	size: function(pod) {
		return comp.core._.pods[pod].people.length;
	},
	mates: function(pod, prompt, cb, style) {
		comp.core.choice({
			cb: cb,
			prompt: prompt,
			style: style || "multiple-choice",
			data: comp.core._.pods[pod].people
		})
	},
	services: function(cb) {
		comp.core.choice({
			prompt: "select a service",
			data: ["New Service"].concat(comp.core._.services),
			cb: function(service) {
				if (service == "New Service") {
					comp.core.prompt({
						prompt: "what's the service called?",
						cb: function(sname) {
							comp.core.edit({
								modelName: "service",
								name: sname
							}, function(data) {
								CT.data.add(data);
								comp.core._.services.push(data);
								cb(data);
							});
						}
					});
				} else
					cb(service);
			}
		});
	},
	init: function() {
		var _ = comp.core._;
		CT.db.get("service", function(services) {
			_.services = services;
			CT.data.addSet(services);
		});
	}
};