comp.core = {
	c: function(opts, cb) {
		CT.net.post({
			path: "/_comp",
			params: opts,
			cb: cb
		});
	},
	proposals: function(pod, cb) {
		comp.core.c({
			action: "proposals",
			pod: pod
		}, cb);
	}
};