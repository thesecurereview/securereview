//var url;
var t0;
/**
* Submit merge request:
*  - compare target and change branches
*  - update the bottom tree in the target branch
*  - propagate the update to the root tree
*  - computet the root tree hash and then new commit
*/
function run(url){

	// Get change number
	var cn = getChangeNumber (url)
	// Get a summary of change
	getChangeSummary(cn, function(result){
		var project = result.project
		var branch = result.branch
		var change_id = result.change_id
		//var changeNumber = result._number

		//TODO: sync the following API calls
		// Get info: change branch
		getRevisionReview(change_id, "current", function(changeInfo){

			// Get info: common ancestor (parent of the 1st commit in change branch)
			getRevisionCommit(change_id, "1", function(caInfo){

				// Get info about the target branch
				getBranchInfo(project, branch, function(targetInfo){
					// Populate the parent window
					setParentInfo (targetInfo);

					// Form heads, Ignore caHead if it's the same as targetHead
					var parents = {
						changeHead: changeInfo.current_revision,
						targetHead: targetInfo.commit
					};
					var caHead = caInfo.parents[0].commit
					if (parents.targetHead !== caHead)
						parents["caHead"] = caHead					
					
					// Run the merge process
					runMergeProcess(change_id, project, parents,
						function(treeHash, objects){

							//TODO: Form a better commit message 
							var commitMessage = `Merge change ${cn}\n\nChange-Id: ${change_id}`
							//remove ca from parents
							parents = [parents.targetHead, parents.changeHead]
							pushCommit({ url, project, branch, //changeNumber
								objects, parents, treeHash, commitMessage }, 
								({ result }) => {
								var t1 = performance.now();
								console.log("Taken time: ", t1 - t0)
								console.log(result)
							});
						}
					);
				});

			});

		});

	});

}


// Event Listeners
document.addEventListener('DOMContentLoaded', function () {
	chrome.tabs.query({active: true, currentWindow: true}, 
	function(tabs) {
		t0 = performance.now();
		url = tabs[0].url;
		run(url);
	});

	/*Push the signed merge commit to the server*/
	document.getElementById('merge_change').addEventListener(
	'click', pushCommit);

});

