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
			iden: function(wall) {
				var cbal = CT.dom.div("your ethereum balance"), ukey = user.core.get("key");
				wall.identifier && comp.core.c({
					action: "balance",
					user: ukey
				}, function(bal) {
					cbal._val = bal;
					CT.dom.setContent(cbal, "ethereum (blockchain wallet) balance: " + bal);
				});
				return CT.dom.div(wall.identifier && [
					cbal,
					wall.identifier,
					CT.dom.button("transfer from carecoin wallet to ethereum wallet", function() {
						comp.core.prompt({
							prompt: "how much do you want to tranfer?",
							style: "number",
							max: wall.outstanding,
							min: 1,
							step: 1,
							initial: 1,
							cb: function(amount) {
								comp.core.c({
									action: "mint",
									user: ukey,
									amount: amount
								}, function() {
									wall.outstanding -= amount;
									cbal._val += amount;
									CT.dom.setContent(comp.settings._.wall.balance,
										"carecoin (platform wallet) balance: " + wall.outstanding);
									CT.dom.setContent(cbal,
										"ethereum (blockchain wallet) balance: " + cbal._val);
									alert("ok!");
								}, function(emsg) {
									alert(emsg);
								});
							}
						});
					})
				] || "(no public key)");
			},
			pkey: function(wall) {
				var _w = comp.settings._.wall,
					iden = CT.dom.div(_w.iden(wall));
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
									CT.dom.setContent(iden, _w.iden(wall));
								});
							}
						});
					}, "left"),
					CT.dom.link("what's this?", function() {
						comp.core.modal({
							content: CT.dom.div([
								CT.dom.div("public keys", "bigger"),
								"Your public key is your address on the ethereum block chain.",
								"The coins you store here can be used like any other ethereum token, or traded on the exchanges.",
								"The coins you retain in your carecoin wallet, on the other hand, can be used for internal transactions, such as purchasing goods and services from other users.",
								"(explain more, provide linx)"
							], "subpadded")
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
		var n = CT.dom.div(), _w = comp.settings._.wall;
		CT.db.one(user.core.get().wallet, function(wall) {
			_w.balance = CT.dom.div("carecoin (platform wallet) balance: " + wall.outstanding);
			CT.dom.setContent(n, [
				_w.balance,
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