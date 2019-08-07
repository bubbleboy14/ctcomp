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
						user.core.update({
							contributor: cont.key
						});
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
						var data = CT.net.get("https://api.github.com/users/" + handle, {
							oauth_token: core.config.keys.gh
						}, true);
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
		},
		wall: {
			pkey: function(wall) {
				var iden = CT.dom.div(wall.identifier);
				return CT.dom.div([
					CT.dom.button("set your key", function() {
						comp.core.prompt({
							prompt: "what's your public key?",
							cb: function(pkey) {
								comp.core.edit({
									key: wall.key,
									identifier: pkey
								}, function() {
									wall.identifier = pkey;
									CT.dom.setContent(iden, pkey);
								});
							}
						});
					}, "left"),
					CT.dom.link("what's this?", function() {
						comp.core.modal({
							content: [
								CT.dom.div("public keys", "bigger"),
								"This is your address on the block chain.",
								"(explain more, provide linx)"
							]
						});
					}, null, "right"),
					CT.dom.div("your public key", "bigger"),
					iden
				], "bordered padded round");
			}
		}
	},
	handle: function() {
		var _ = comp.settings._;
		_.hnode = CT.dom.div(user.core.get("contributor") ? "you're all set!"
			: CT.dom.button("click here to associate your github account", _.gh.assoc));
		return _.hnode;
	},
	chat: function() {
		var u = user.core.get();
		return CT.dom.checkboxAndLabel(null, u.chat, "enable live chat", null, null, function(cbox) {
			comp.core.edit({
				key: u.key,
				chat: cbox.checked
			}, function() {
				user.core.update({
					chat: cbox.checked
				});
			});
		});
	},
	wallet: function() {
		var n = CT.dom.div();
		CT.db.one(user.core.get().wallet, function(wall) {
			CT.dom.setContent(n, [
				"balance: " + wall.outstanding,
				comp.settings._.wall.pkey(wall)
			]);
		});
		return n;
	},
	init: function() {
		CT.dom.setContent("ctmain", CT.dom.div([
			CT.dom.div([
				CT.dom.div("your basic settings", "biggest"),
				comp.settings.chat()
			], "bordered padded round mb5"),
			CT.dom.div([
				CT.dom.div("your github account", "biggest"),
				comp.settings.handle()
			], "bordered padded round mb5"),
			CT.dom.div([
				CT.dom.div("your wallet", "biggest"),
				comp.settings.wallet()
			], "bordered padded round")
		], "centered"));
	}
};