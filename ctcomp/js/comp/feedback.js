comp.feedback.Feedback = CT.Class({
	CLASSNAME: "comp.feedback.Feedback",
	_: {
		questions: [],
		answers: [], // Answer keys
		topic: function() {
			var oz = this.opts, _ = this._,
				intact = _.interaction,
				top = intact.modelName;
			if (top == "request")
				top = "conversation";
			return top + ": " + CT.parse.shortened(intact.notes, 100, 10, true);
		},
		qbox: function(prompt) {
			var oz = this.opts, rating = CT.dom.numberSelector({
				initial: 5,
				min: 1,
				max: 5,
				step: 1
			}), response = CT.dom.smartField({
				isTA: true,
				classname: "w1",
				blurs: oz.blurs.question
			}), n = CT.dom.div([
				prompt, rating, response
			], oz.classes.qbox), _ = this._;
			n.value = function() {
				return data = {
					modelName: "answer",
					prompt: prompt,
					rating: rating.value(),
					response: response.fieldValue()
				};
			};
			_.questions.push(n);
			return n;
		},
		subqz: function(cb) {
			var _ = this._, qz = _.questions, az = _.answers;
			if (qz.length == az.length)
				return cb(az);
			comp.core.edit(qz[az.length].value(), function(adata) {
				az.push(adata.key);
				_.subqz(cb);
			});
		}
	},
	submit: function() {
		var _ = this._;
		this._.subqz(function(akeys) {
			comp.core.edit({
				modelName: "feedback",
				answers: akeys,
				topic: _.topic(),
				notes: _.notes.fieldValue(),
				person: user.core.get("key"),
				interaction: _.interaction.key,
				followup: _.followup.isChecked()
			}, function() {
				alert("thanks for sharing!");
				location = "/comp/pods.html";
			});
		});
	},
	build: function() {
		var oz = this.opts, _ = this._;
		_.notes = CT.dom.smartField({
			isTA: true,
			classname: "w1",
			blurs: oz.blurs.notes
		});
		_.followup = CT.dom.checkboxAndLabel("request a follow up conversation?");
		CT.dom.setContent(oz.node, CT.dom.div([
			CT.dom.div(_.topic(), "biggest"),
			CT.dom.div("feedback form", "big"),
			oz.prompts.map(_.qbox),
			[
				CT.dom.div(_.notes, oz.classes.qbox),
				_.followup,
				CT.dom.button("submit", this.submit)
			]
		], "centered"));
	},
	load: function(interaction) {
		this._.interaction = interaction;
		this.build();
	},
	init: function(opts) {
		this.opts = opts = CT.merge(opts, {
			node: "ctmain",
			classes: {},
			prompts: ["why aren't there any prompts?"]
		});
		this.ikey = location.hash.slice(1);
		if (!this.ikey)
			location = "/";
		else
			CT.db.one(this.ikey, this.load);
	}
});