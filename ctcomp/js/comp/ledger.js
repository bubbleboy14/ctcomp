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
				CT.dom.div(item.note, "big"),
				"type: " + item.modelName,
				"amount: " + item.amount,
				"pod: " + pod.name,
				item.details.replace(/\n/g, "<br>")
			]);
		});
	},
	view: function(wkey, pnode) {
		var cnames = comp.ledger._.cnames,
			nopn = !pnode;
		CT.db.get("ledgeritem", function(iz) {
			if (nopn)
				pnode = CT.dom.div();
			CT.dom.setContent(pnode, iz.length ? CT.dom.div(iz.map(function(item) {
				return CT.dom.flex([
					[
						CT.dom.span(item.created),
						CT.dom.pad(3),
						CT.dom.span(item.note, "big"),
					],
					CT.dom.div(item.amount, cnames[item.modelName])
				], "pointer row hoverglow", null, {
					onclick: function() {
						comp.ledger.item(item);
					}
				});
			}), "ledger") : CT.dom.div("nothing yet!", "centered"));
			nopn && CT.modal.modal(pnode);
		}, null, null, null, {
			wallet: wkey
		});
	}
};