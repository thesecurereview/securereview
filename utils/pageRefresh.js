function refreshPage(url) {
    chrome.tabs.getSelected(null, (tab) => {
        let code = 'window.location.replace("url");'.replace("url", url);
        chrome.tabs.executeScript(tab.id, {
            code: code
        });
    });
}
