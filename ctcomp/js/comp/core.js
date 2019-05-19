comp.core = {
	_: {
		service_keys: {}
	},
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
	pod: function(pod, cb) {
		comp.core.c({
			action: "pod",
			pod: pod
		}, cb);
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
							}, cb);
						}
					});
				} else
					cb(service);
			}
		});
	},
	service: function(skey) {
		return comp.core._.service_keys[skey];
	},
	init: function() {
		var _ = comp.core._;
		CT.db.get("service", function(services) {
			_.services = services;
			services.forEach(function(service) {
				_.service_keys[service.key] = service;
			});
		});
	}
};