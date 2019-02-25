
/*Perform UI checks to verify API info*/
//table of commits
tableClass = "com-google-gerrit-client-change-CommitBox_BinderImpl_GenCss_style-header" 
//tbody has three tr
//Author, Committer, CommitInfo(Commit, Parents, ChangeId)
commitDiv = "com-google-gerrit-client-change-CommitBox_BinderImpl_GenCss_style-clippy"
span = "com-google-gwtexpui-clippy-client-ClippyCss-label"

parentDiv = "com-google-gerrit-client-change-CommitBox_BinderImpl_GenCss_style-parent"
span = "com-google-gwtexpui-clippy-client-ClippyCss-label"

changeIdDiv = "com-google-gerrit-client-change-CommitBox_BinderImpl_GenCss_style-clippy"
span= "com-google-gwtexpui-clippy-client-ClippyCss-label"


chrome.runtime.onMessage.addListener(
function(message, sender, sendResponse) {

/*reading info from reg commit*/
	if (message.indicator == "url_info")
	{
		var url = document.URL;
		sendResponse({"url":url})
     	}
});
