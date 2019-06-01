window.CC = {
	_: {
		send: function(entity, action, data) {
			entity.iframe.contentWindow.postMessage({
				action: action,
				data: data
			}, entity.iframe._targetOrigin);
		},
		sender: function(action, entity) {
			return function(data) {
				if (entity.ready)
					CC._.send(entity, action, data);
				else
					entity.pending.push({ action: action, data: data});
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
			iframe: _.iframe(),
			pending: []
		};
		v.iframe.onload = function() {
			v.ready = true;
			v.pending.forEach(function(p) {
				_.send(v, p.action, p.data);
			});
		};
		v.view = _.sender("view", v);
		return v;
	}
};