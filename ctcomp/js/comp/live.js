comp.live = {
	video: function(podname, ukey) {
		var vbutt = CT.dom.button("Video Chat"),
			cname = ukey ? CT.chat.privateChatName(ukey, user.core.get("key")) : podname.replace(/ /g, "");
		vbutt.onclick = function() {
			vbutt._modal = vbutt._modal || new CT.modal.Modal({
				center: false,
				innerClass: "w1 h1 noflow",
				className: "vslide mosthigh fixed noflow",
				transition: "slide",
				slide: {
					origin: "bottomleft"
				},
				content: CT.dom.iframe("https://fzn.party/stream/widget.html#" + cname + "_zoom",
					"w1 h1", null, { allow: "microphone; camera" })
			});
			vbutt._modal.showHide();
		};
		return [
			CT.dom.span(podname),
			CT.dom.pad(),
			vbutt
		];
	},
	_chat: function(channels, parent) {
		parent = parent || "ctmain";
		var u = user.core.get(), doit = function() {
			CT.dom.addContent(parent, CT.chat.widget(u.key,
				channels, "Pods", comp.live.video));
		};
		if (u.chat)
			return doit();
		var enabler = CT.dom.link("enable chat", function() {
			CT.dom.remove(enabler);
			doit();
		}, null, "abs r0 b0 big bold mosthigh");
		CT.dom.addContent(parent, enabler);
	},
	chat: function(channels, parent) {
		if (channels && channels.length)
			comp.live._chat(channels, parent);
		else {
			comp.core.mypods(function(pods) {
				comp.live._chat(pods, parent);
			});
		}
	}
};