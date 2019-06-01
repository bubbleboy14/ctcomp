comp.widget = {
	_: {
		receive: function(event) {
			var d = event.data;
			if (d.action == "view") {
				comp.core.c(CT.merge(d.data, {
					action: "view"
				}));
			}
		}
	},
	init: function() {
		window.addEventListener("message", comp.widget._.receive);
	}
};