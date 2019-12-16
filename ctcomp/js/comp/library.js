comp.library = {
	view: function(r) {
		var data = [
			CT.dom.div(r.modelName, "right"),
			CT.dom.div(r.name, "big"),
			r.description,
			r.tags.map(function(t) { return CT.data.get(t).name; }).join(", ")
		];
		if (r.modelName == "organization") {
			r.url && data.push(CT.dom.link("website", null, r.url, "block"));
			r.phone && data.push(CT.dom.div("phone #: " + r.phone)); // phone link instead?
		} else if (r.modelName == "book") {
			data.push(r.author);
			r.read && data.push(CT.dom.link("read", null, r.read, "block"));
			r.buy && data.push(CT.dom.link("buy", null, r.buy, "block"));
		} else if (r.modelName == "web")
			data.push(CT.dom.link(r.kind, null, r.url, "block"));
		else if (r.modelName == "media") {
			if (r.kind == "pdf")
				data.push(CT.dom.link("pdf", null, r.data, "block"));
			else
				data.push(CT.dom[r.kind](r.data));
		}
		return CT.dom.div(data, "bordered padded margined");
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
		comp.core.choice({
			prompt: "what kind of resource?",
			data: ["organization", "book", "web", "media"],
			cb: function(variety) {
				comp.core.prompt({
					prompt: "what is this resource called?",
					cb: function(name) {
						comp.core.prompt({
							prompt: "please describe this resource",
							cb: function(description) {
								var item = {
									modelName: variety,
									name: name,
									description: description,
									editors: [user.core.get("key")]
								};
								if (variety == "web") {
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
								} else if (variety == "media") {
									comp.core.choice({
										prompt: "what kind of media resource?",
										data: ["img", "video", "audio", "pdf"],
										cb: function(kind) {
											item.kind = kind;
											comp.library.add(item, function(res) {

												// TODO: add media data!

												cb(res);
											});
										}
									});
								} else {
									comp.core.prompt({
										style: "form",
										prompt: variety + " editor",
										className: "basicpopup mosthigh w400p",
										data: comp.forms[variety],
										cb: function(vals) {
											comp.library.add(CT.merge(vals, item), cb);
										}
									});
								}
							}
						});
					}
				});
			}
		});
	}
};