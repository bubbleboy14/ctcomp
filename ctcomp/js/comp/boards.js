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
		var data = [
			CT.dom.div(b.name, "biggerest"),
			b.description
		];
		if (b.modelName == "board") {
			var tz = CT.dom.div(), right = CT.dom.div([
				tz, "anonymous: " + b.anonymous
			], "right");
			CT.db.multi(b.tags, function(tags) {
				CT.dom.setContent(tz, tags.map(function(t) {
					return t.name;
				}).join(", "));
			});
			data = [right].concat(data).concat([
				user.core.convo(b.conversation)
			]);
		}
		return data;
	},
	pod: function(pod) {
		var nz = comp.boards._.nodes;
		CT.db.multi(pod.boards, function(bz) {
			CT.panel.slider([{
				name: "Info",
				description: CT.dom.div([
					CT.dom.div(pod.name, "biggerer"),
					pod.blurb,
					CT.dom.button("create a message board!", function() {
						location = "/comp/pods.html#" + pod.key;
					})
				], "centered subpadded")
			}].concat(bz), nz.boards, nz.slider,
				null, null, null, true, null, true,
				comp.boards.board, true);
		});
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
		CT.dom.setContent(nodes.main, nodes.slider);
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