comp.core = {
	c: function(opts, cb) {
		CT.net.post({
			path: "/_comp",
			params: opts,
			cb: cb
		});
	},
//	decide.core.util.proposals("ctmain");
	proposals: function(pod) {

	},
	pods: function(memberships) {
		CT.db.multi(memberships.map(function(m) {
			return m.pod;
		}), function(pods) {
			
		});
	}
};