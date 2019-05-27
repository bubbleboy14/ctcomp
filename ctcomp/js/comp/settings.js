comp.settings = {
	_: {
		gh: {
			confirmed: function() {
				var _ = comp.settings._;
				comp.core.edit({
					modelName: "contributor",
					handle: _.handle
				}, function(cont) {
					comp.core.edit({
						key: user.core.get("key"),
						contributor: cont.key
					}, function() {
						CT.dom.setContent(_.hnode, "you're all set!");
					});
				});
			},
			confirm: function() {
				var _ = comp.settings._;
				comp.core.prompt({
					prompt: "we just sent you a code -- check the email address associated with your github account. so what's the code?",
					cb: function(val) {
						if (parseInt(val) == _.code)
							_.gh.confirmed();
					}
				});
			},
			assoc: function() {
				var _ = comp.settings._;
				comp.core.prompt({
					prompt: "what's your github handle?",
					cb: function(handle) {
						var data = CT.net.get("https://api.github.com/users/" + handle, null, true);
						if (!data.email)
							return alert("this github handle has no publicly associated email address! fix this and try again (you might need to wait for github's cache to refresh)!");
						_.handle = handle;
						_.code = CT.data.random(10000);
						comp.core.c({
							action: "confcode",
							email: data.email,
							code: _.code
						}, _.gh.confirm);
					}
				});
			}
		}
	},
	handle: function() {
		var _ = comp.settings._;
		_.hnode = CT.dom.div(user.core.get("contributor") ? "you're all set!"
			: CT.dom.button("click here to associate your github account", _.gh.assoc));
		return _.hnode;
	},
	wallet: function() {
		var n = CT.dom.div();
		
		return n;
	},
	init: function() {
		CT.dom.setContent("ctmain", CT.dom.div([
			CT.dom.div([
				CT.dom.div("your github account", "biggest"),
				comp.settings.handle()
			], "bordered padded round"),
			CT.dom.div([
				CT.dom.div("your wallet", "biggest"),
				comp.settings.wallet()
			], "bordered padded round")
		], "centered"));
	}
};