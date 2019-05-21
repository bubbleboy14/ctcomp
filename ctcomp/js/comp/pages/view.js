/*
expects location like: /comp/view.html#CONTENT_KEY
*/

CT.onload(function() {
	CT.net.post({
		path: "/_comp",
		params: {
			action: "view",
			content: location.hash.slice(1)
		}
	});
});