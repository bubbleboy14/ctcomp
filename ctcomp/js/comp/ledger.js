comp.ledger = {
	item: function(item) {
		CT.db.one(item.pod, function(pod) {
			CT.modal.modal([
				CT.dom.div(item.amount, "right"),
				CT.dom.div(item.note, "big"),
				"pod: " + pod.name,
				item.details
			]);
		});
	},
	view: function(wkey, pnode) {
		CT.db.get("ledgeritem", function(iz) {
			CT.dom.setContent(pnode, iz.length ? iz.map(function(item) {
				return CT.dom.flex([
					item.note, item.amount
				], "row", null, {
					onclick: function() {
						comp.ledger.item(item);
					}
				});
			}) : CT.dom.div("nothing yet!", "centered"));
		}, null, null, null, {
			wallet: wkey
		});
	}
};