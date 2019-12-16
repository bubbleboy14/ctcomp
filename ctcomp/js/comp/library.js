comp.library = {
	_: {
		web: function(item, cb) {
			comp.core.choice({
				prompt: "what kind of web resource?",
				data: ["site", "article", "video", "podcast", "pdf"],
				cb: function(kind) {
					item.kind = kind;
					comp.core.prompt({
						prompt: "please provide web address",
						blurs: ["http://example.com", "https://website.com/path"],
						cb: function(url) {
							item.url = url;
							comp.library.add(item, cb);
						}
					});
				}
			});
		},
		media: function(item, cb) {
			comp.core.choice({
				prompt: "what kind of media resource?",
				data: ["img", "video", "audio", "pdf"],
				cb: function(kind) {
					item.kind = kind;
					comp.library.add(item, function(res) {
						comp.library.media(res, kind, cb, "item");
					});
				}
			});
		},
		basic: function(item, cb) {
			comp.core.prompt({
				style: "form",
				prompt: item.modelName + " editor",
				className: "basicpopup mosthigh w400p",
				data: comp.forms[item.modelName],
				cb: function(vals) {
					comp.library.add(CT.merge(vals, item), cb);
				}
			});
		}
	},
	slider: function(items) {
		var liste = CT.dom.div(null, "right"), cats = {}, mn,
			slide = CT.dom.div(null, "abs all0 r100 scroller"),
			n = CT.dom.div([liste, slide], "full relative"),
			slider = CT.panel.slider([], liste, slide, null,
				null, null, true, core.config.ctcomp.blurbs);
		items.forEach(function(item) {
			mn = item.modelName;
			cats[mn] = cats[mn] || [];
			cats[mn].push(item);
		});
		setTimeout(function() {
			Object.keys(cats).forEach(function(section, i) {
				CT.dom.setContent(slider.add(section, !i), [
					CT.dom.div(section, "bigger right"),
					cats[section].map(function(item) {
						return CT.dom.div(comp.library.view(item).slice(1),
							"bordered padded margined round vtop inline-block");
					})
				]);
			});
		});
		return n;
	},
	view: function(r) {
		var data = [
			CT.dom.div(r.modelName, "right"),
			CT.dom.div(r.name, "big"),
			r.description,
			r.tags.map(function(t) { return CT.data.get(t).name; }).join(", ")
		];
		if (r.modelName == "organization") {
			r.url && data.push(CT.dom.link("website",
				null, r.url, "block", null, null, true));
			r.phone && data.push(CT.dom.div("phone #: " + r.phone)); // phone link instead?
		} else if (r.modelName == "book") {
			data.push(r.author);
			r.read && data.push(CT.dom.link("read",
				null, r.read, "block", null, null, true));
			r.buy && data.push(CT.dom.link("buy",
				null, r.buy, "block", null, null, true));
		} else if (r.modelName == "web")
			data.push(CT.dom.link(r.kind, null,
				r.url, "block", null, null, true));
		else if (r.modelName == "media") {
			if (r.kind == "pdf")
				data.push(CT.dom.link("pdf", null,
					r.item, "block", null, null, true));
			else if (r.kind == "video")
				data.push(CT.dom.video({
					src: r.item,
					controls: true
				}));
			else
				data.push(CT.dom[r.kind](r.item));
		}
		return data;
	},
	media: function(item, kind, cb, property) {
		property = property || kind;
		comp.core.prompt({
			prompt: "select " + kind,
			style: "file",
			cb: function(ctfile) {
				ctfile.upload("/_db", function(url) {
					item[property] = url;
					cb(item);
				}, {
					action: "blob",
					key: item.key,
					property: property
				});
			}
		});
	},
	add: function(item, cb) {
		comp.core.tags(function(tagz) {
			item.tags = tagz.map(function(t) {
				return t.key;
			});
			comp.core.edit(item, cb);
		});
	},
	item: function(cb) {
		var _ = comp.library._;
		comp.core.choice({
			prompt: "what kind of resource?",
			data: ["organization", "book", "web", "media"],
			cb: function(variety) {
				comp.core.prompt({
					prompt: "what is this resource called?",
					cb: function(name) {
						comp.core.prompt({
							prompt: "please describe this resource",
							isTA: true,
							cb: function(description) {
								(_[variety] || _.basic)({
									modelName: variety,
									name: name,
									description: description,
									editors: [user.core.get("key")]
								}, cb);
							}
						});
					}
				});
			}
		});
	}
};