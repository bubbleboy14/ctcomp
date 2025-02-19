comp.generation = {
	name: function(pkey) {
		var person = CT.data.get(pkey), n = person.firstName;
		if (person.lastName)
			n += " " + person.lastName;
		return n;
	},
	item: function(header, data, extras) {
		return CT.dom.div([
			CT.dom.div("submitted by: " + comp.generation.name(CT.data.get(data.membership).person), "right"),
			CT.dom.div(header, "big"),
			data.notes.replace(/\n/g, "<br>"),
			extras,
			data.passed ? "passed" : "pending"
		], "bordered padded margined");
	},
	codebase: function(c) {
		comp.pods._.codebases[c.repo] = c;
		var deps = CT.dom.div(null, "centered");
		deps.update = function() {
			CT.db.multi(c.dependencies, function(dz) {
				CT.dom.setContent(deps, dz.map(function(d) {
					return CT.dom.div(d.repo, "bordered padded margined round inline-block");
				}));
			});
		};
		deps.update();
		return CT.dom.div([
			CT.dom.div(c.variety, "right"),
			CT.dom.div(c.owner + " / " + c.repo, "big"),
			deps, CT.dom.button("add dependencies", function() {
				comp.core.dependencies(c, function() {
					comp.core.edit({
						key: c.key,
						dependencies: c.dependencies
					}, deps.update);
				});
			})
		], "bordered padded margined");
	},
	need: function(n) {
		return CT.dom.div([
			n.description,
			n.tags.map(function(t) { return CT.data.get(t).name; }).join(", "),
			"ongoing: " + n.ongoing,
			"closed: " + n.closed,
		], "bordered padded margined round inline-block");
	},
	offering: function(o) {
		return CT.dom.div([
			o.description,
			o.tags.map(function(t) { return CT.data.get(t).name; }).join(", "),
			"ongoing: " + o.ongoing,
			"closed: " + o.closed,
		], "bordered padded margined round inline-block");
	},
	dependency: function(d) {
		return CT.dom.div(d.repo + " (" + d.variety + ")",
			"bordered padded margined round inline-block");
	},
	board: function(b) {
		return CT.dom.div([
			CT.dom.div(b.name, "big"),
			b.description,
			"anonymous: " + b.anonymous,
			b.tags.map(function(t) { return CT.data.get(t).name; }).join(", ")
		], "bordered padded margined");
	},
	resource: function(r) {
		return CT.dom.div([
			CT.dom.img(r.icon, "right"),
			CT.dom.div(r.name, "big"),
			r.address,
			r.description,
			r.tags.map(function(t) { return CT.data.get(t).name; }).join(", ")
		], "bordered padded margined");
	},
	library: function(r) {
		var n = CT.dom.div(null, "bordered padded margined");
		CT.db.one(r, function(rdata) {
			CT.dom.setContent(n, comp.library.view(rdata));
		});
		return n;
	},
	content: function(c) {
		return CT.dom.div([
			CT.dom.div(c.identifier, "big"),
			CT.dom.link("manual link - probs unnecessary", function() {
				CT.modal.modal([
					CT.dom.div("Manual Linking - Probably Not Necessary", "bigger underline"),
					[
						"To manually link this content, add <b>&lt;iframe src='",
						location.protocol,
						"//",
						location.host,
						"/comp/view.html#",
						c.key,
						"'&gt;&lt;/iframe&gt;</b> to your web page."
					].join(""),
					CT.dom.br(),
					"Unless you're crafting your site by hand (without the CC API), this is almost certainly not necessary."
				]);
			}, null, "centered block")
		], "bordered padded margined");
	},
	product: function(p) {
		return CT.dom.div([
			CT.dom.img(p.image, "right wm1-2 hm400p"),
			CT.dom.div(p.variety, "right italic ph10"),
			CT.dom.div(p.name, "big"),
			CT.dom.div(p.price + " carecoins", "bold"),
			p.description,
			CT.dom.div(null, "clearnode")
		], "bordered padded margined");
	},
	expense: function(e) {
		var gen = comp.generation;
		return gen.item(e.variety + " - " + (e.amount * 100) + "%", e,
			e.executor && ("executor: " + gen.name(e.executor)));
	},
	service: function(a) { // act
		return comp.generation.item(CT.data.get(a.service).name, a);
	},
	request: function(r) {
		var gen = comp.generation, title = r.change;
		if (r.person)
			title += " " + gen.name(r.person);
		return gen.item(title, r);
	},
	estimate: function(cb, curval) {
		curval = curval || 0;
		var _ = comp.pods._, cfg = core.config.ctcomp,
			lims = cfg.limits, cur = _.current, counts = cur.counts,
			diff = lims.commitments - counts.commitments - curval;
		if (!diff)
			return alert("you're already committed to the max! scale back something else and try again ;)");
		comp.core.prompt({
			prompt: "how many hours per week?",
			style: "number",
			max: Math.min(24, diff),
			initial: curval || Math.min(1, diff),
			cb: function(estimate) {
				counts.commitments += estimate - curval;
				_.nodes.limits.update();
				cb(estimate);
			}
		});
	},
	commitment: function(c) {
		var _ = comp.pods._, gen = comp.generation, n = CT.dom.div(),
			memship = comp.core.pod2memship(_.current.pod),
			ismem = c.membership == memship.key;
		n.adjust = function() {
			gen.estimate(function(estimate) {
				comp.core.edit({
					key: c.key,
					estimate: estimate
				});
				if (c.passed && (estimate > c.estimate)) { // requires reapproval
					comp.core.c({
						action: "unverify",
						verifiable: c.key
					});
					c.passed = false;
				}
				c.estimate = estimate;
				n.update();
			}, c.estimate);
		};
		n.update = function() {
			var extras = [c.estimate + " hours per week"];
			if (ismem) {
				extras.push(CT.dom.button("adjust", n.adjust));
			}
			CT.dom.setContent(n, gen.item(CT.data.get(c.service).name, c, extras));
		};
		n.update();
		return n;
	},
	adjustment: function(a) {
		var tline = a.name + " => " + a.compensation + " (";
		if (!a.passed) tline += "not ";
		tline += "passed)";
		return CT.dom.div([
			CT.dom.div(tline, "big"),
			a.description,
			CT.dom.link("view details", function() {
				var deets = CT.dom.div();
				decide.core.util.proposal(a, deets);
				CT.modal.modal(deets);
			})
		], "bordered padded margined");
	},
	streamer: function(modelName, filters, builder, pnode, cname, order) {
		CT.db.streamer(modelName, order || "-created", filters, builder, pnode, cname, !pnode);
	},
	framedStream: function(modname, filts) {
		var gen = comp.generation;
		gen.streamer(modname, filts, gen[modname], gen.frame(null, modname));
	},
	frame: function(data, item, plur, buttname) {
		var _ = comp.pods._, cfg = core.config.ctcomp,
			n, content, pcap, gen = comp.generation;
		plur = plur || item;
		pcap = CT.parse.capitalize(plur);
		n = _.nodes[item + "_list"] = CT.dom.div(data && data[plur].map(gen[item]));
		content = [
			CT.dom.div(pcap, "biggest"),
			cfg.blurbs[pcap],
			n
		];
		data && content.unshift(CT.dom.button(buttname || "new",
			comp.submission.submitter(item), "right"));
		CT.dom.setContent(_.nodes[plur], content);
		return n;
	}
};