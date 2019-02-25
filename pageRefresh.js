function refresh_parent(url) {

	chrome.tabs.getSelected(null, function(tab) {
	  	var code = 'window.location.replace("url");'.replace("url", url);
	  	//var code = 'window.location.reload();';
	  	chrome.tabs.executeScript(tab.id, {code: code});
	});

	//window.close();

}

/*
* refresh the page 
*/
function refreshPage(url){

	//var new_url = url.replace("/new/", "/tree/");
	return refresh_parent (url);
}





