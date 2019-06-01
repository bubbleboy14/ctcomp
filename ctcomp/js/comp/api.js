window.CC = {
	_: {
		sender: function(action, entity) {
			return function(data) {
				entity.iframe.contentWindow.postMessage({
					action: action,
					data: data
				}, entity.iframe._targetOrigin);
			};
		},
		iframe: function() {
			var ifr = document.createElement("iframe"),
				loc = CC._.location();
			ifr._targetOrigin = loc;
			ifr.src = loc + "/comp/widget.html";
			ifr.style.visibility = "hidden";
			document.body.appendChild(ifr);
			return ifr;
		},
		location: function() {
			var i, p, s = document.getElementsByTagName("script"),
				flag = "/comp/api.js", flen = flag.length;
			for (i = 0; i < s.length; i++) {
				p = s[i].src;
				if (p.slice(-flen) == flag)
					return p.slice(0, -flen);
			}
		}
	},
	viewer: function() {
		var _ = CC._, v = {
			iframe: _.iframe()
		};
		v.view = _.sender("view", v);
		return v;
	}
};