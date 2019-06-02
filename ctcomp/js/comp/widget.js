comp.widget = {
	_: {
		receive: function(event) {
			var d = event.data, data = d.data, _ = comp.widget._;
			_.targetOrigin = event.origin;
			if (d.action == "view") {
				comp.core.c(CT.merge(data, {
					action: "view"
				}));
			} else if (d.action == "enroll") {
				comp.core.c({
					action: "enroll",
					agent: data.agent,
					pod: data.pod,
					person: user.core.get("key")
				}, function(memkey) {
					_.done(memkey, "enrollment");
				});
			}
		},
		done: function(data, action) {
			var _ = comp.widget._, d = {
				action: action,
				data: data
			};
			window.parent.postMessage(d, _.targetOrigin);
		},
		setSwitcher: function() {
			var bignode = CT.dom.div(null, "biggerest bigpadded down30"), upyou = function() {
				var u = user.core.get();
				CT.dom.setContent(bignode, u ? ("you are " + u.email) : "Who Are You?");
				comp.widget._.done(u && u.email, "switch");
			};
			CT.dom.setContent("ctmain", CT.dom.div([
				user.core.links(null, true),
				bignode
			], "h1 wm400p automarg centered"));
			user.core.onchange(upyou);
			setTimeout(upyou, 1000);
		}
	},
	init: function() {
		window.addEventListener("message", comp.widget._.receive);
		if (document.location.hash.slice(1) == "switcheroo")
			comp.widget._.setSwitcher();
	}
};