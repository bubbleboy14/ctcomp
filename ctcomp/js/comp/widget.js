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
			} else if (d.action == "payment") {
				_.pdata = data;
				_.payUp();
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
		},
		setPayer: function() {
			var _ = comp.widget._;
			_.pnode = CT.dom.div(null, "biggerest bigpadded down30");
			CT.dom.setContent("ctmain", CT.dom.div([
				user.core.links(null, true),
				_.pnode
			], "h1 wm400p automarg centered"));
			user.core.onchange(_.payUp);
			_.payUp();
		},
		payUp: function() {
			var u = user.core.get(), _ = comp.widget._,
				d = _.pdata;
			CT.dom.setContent(_.pnode, u ? [
				"you are " + u.email,
				pdata && CT.dom.button("pay " + d.amount, function() {
					comp.core.c(CT.merge(d, {
						action: "pay",
						payer: user.core.get("key")
					}), function(pkey) {
						CT.dom.setContent(_.pnode,
							"you did it! now check your email, click the confirmation link, and you're done!");
						_.done(pkey, "pay");
					}, function(emsg) {
						CT.dom.setContent(_.pnode, emsg);
					});
				})
			] : "Who Are You?");
		}
	},
	init: function() {
		var h = document.location.hash.slice(1), _ = comp.widget._;
		window.addEventListener("message", _.receive);
		if (h == "switcheroo")
			_.setSwitcher();
		else if (h == "payeroo")
			_.setPayer();
	}
};