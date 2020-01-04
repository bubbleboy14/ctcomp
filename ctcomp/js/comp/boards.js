comp.boards = {
	_: {
		nodes: {
			pods: CT.dom.div(),
			boards: CT.dom.div(),
			slider: CT.dom.div(null, null, "slider"),
			main: CT.dom.div(null, "h1 mr160 relative"),
			right: CT.dom.div(null, "h1 w160p up5 scrolly right")
		}
	},
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
		CT.dom.setContent(comp.boards._.nodes.main, [
			CT.dom.div(pod.name, "biggerest"),
			bnode
		]);
	},
	menu: function() {
		var _ = comp.boards._, nodes = _.nodes,
			cfg = core.config.ctcomp;
		CT.dom.setContent(nodes.right, [
			CT.dom.div(nodes.pods, cfg.classes.menu),
			CT.dom.div([
				CT.dom.div("Boards", "bold"),
				nodes.boards
			], cfg.classes.menu)
		]);
//		CT.dom.setContent(nodes.main, nodes.slider);
		CT.dom.setContent("ctmain", CT.dom.div([
			nodes.right,
			nodes.main
		], "abs all0"));
	},
	build: function(pods) {
		var tlist = CT.panel.triggerList(pods, comp.boards.pod);
		CT.dom.setContent(comp.boards._.nodes.pods, tlist);
		tlist.firstChild.trigger();
	},
	init: function() {
		comp.boards.menu();
		comp.core.mypods(comp.boards.build, true);
	}
};