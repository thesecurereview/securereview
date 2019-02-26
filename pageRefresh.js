function refresh_parent(url) {

	chrome.tabs.getSelected(null, function(tab) {
	  	var code = 'window.location.replace("url");'.replace("url", url);
	  	chrome.tabs.executeScript(tab.id, {code: code});
	});

}

function refreshPage(url){
	//TODO set url to any page
	return refresh_parent (url);
}





