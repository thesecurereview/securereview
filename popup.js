// TODO: Check if the prv key is set
// TODO: Check if user has access to give -+2 score, show the appropriate popup window
// TODO: Pop up a window if user's credentials are not correct

document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.getSelected(null, function(tab) {
        let url = tab.url;

        // Check for proper request
        let urlInfo = parseURL(url);
        console.log(urlInfo)
    });
});