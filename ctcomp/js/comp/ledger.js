comp.ledger = {
	_: {
		cnames: {
			debit: "bold red",
			deposit: "bold green"
		}
	},
	item: function(item) {
		CT.db.one(item.pod, function(pod) {
			CT.modal.modal([
				CT.dom.div(CT.parse.breakurl(item.note), "big"),
				"type: " + item.modelName,
				"amount: " + item.amount,
				"pod: " + pod.name,
				item.details.replace(/\n/g, "<br>")
			]);
		});
	},
	view: function(wkey, pnode) {
		var cnames = comp.ledger._.cnames;
		comp.generation.streamer("ledgeritem", {
			wallet: wkey
		}, function(item) {
			return CT.dom.flex([
				[
					CT.dom.span(item.created),
					CT.dom.pad(3),
					CT.dom.span(CT.parse.breakurl(item.note),
						"big"),
				],
				CT.dom.div(item.amount, cnames[item.modelName])
			], "pointer row hoverglow", null, {
				onclick: function() {
					comp.ledger.item(item);
				}
			});
		}, pnode, "ledger");
	}
};