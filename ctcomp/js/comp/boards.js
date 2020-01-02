comp.boards = {
	board: function(b) {
		return CT.dom.div([
			CT.dom.div(b.name, "big"),
			b.description,
			// tags[], conversation
		]);
	},
	pod: function(pod) {
		var bnode = CT.dom.div();
		CT.db.multi(pod.boards, function(bz) {
			CT.dom.setContent(bnode, bz.map(comp.boards.board));
		});
		return CT.dom.div([
			CT.dom.div(pod.name, "biggerest"),
			bnode
		]);
	},
	init: function() {
		comp.core.mypods(function(pods) {
			CT.dom.setContent("ctmain", [
				CT.dom.div("message boards!", "gigantic"),
				pods.map(comp.boards.pod)
			]);
		}, true);
	}
};