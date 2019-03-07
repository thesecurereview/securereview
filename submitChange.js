/*
- Compare base and change branches
- Find the merge base commit (Common Ancestor)
- 
*/
var url;
var repo_url;

/**
* Run the submitting merge by 
* comparing the base and change branches
*/
function run(){

	// Get change number
	var cn = getChangeNumber (url)
	getChangeSummary(cn, function(result){

		var project = result.project
		var branch = result.branch
		var change_id = result.change_id
		var changeNumber = result._number

		//TODO: sync the following API calls
		// Get info: change branch
		getRevisionReview(change_id, "current", function(changeInfo){

			// Get info: common ancestor (parent of the 1st commit in change branch)
			getRevisionCommit(change_id, "1", function(caInfo){

				// Get info about the base branch
				getParentInfo(project, branch, function(baseInfo){

					// Populate the parent window
					setParentInfo (baseInfo);

					// Form heads, Ignore caHead if it's the same as baseHead
					var heads = {
						changeHead: changeInfo.current_revision,
						baseHead: baseInfo.commit
					};
					var caHead = caInfo.parents[0].commit
					if (heads.baseHead !== caHead)
						heads["caHead"]	= caHead					
					
					// Run the merge process
					runMergeProcess(change_id, project, heads);
				});

			});

		});

	});

}


/**
* Push the merge commit to the server
*/
function pushCommit(){

}


// Event Listeners
document.addEventListener('DOMContentLoaded', function () {

	chrome.tabs.query({active: true, currentWindow: true}, 
	function(tabs) {
		url = tabs[0].url;
		run();
	});

	/*Push the signed merge commit to the server*/
	document.getElementById('merge_change').addEventListener(
	'click', pushCommit);

});




	


