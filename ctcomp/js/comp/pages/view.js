/*
expects location like: /comp/view.html#CONTENT_KEY
*/

CT.onload(function() {
	var h = location.hash.slice(1);
	location.hash = "";
	CT.net.post({
		path: "/_comp",
		params: {
			action: "view",
			content: h
		}
	});
});