/*
- Compare base and change branches
- Find the merge base commit (Common Ancestor)
- 
*/
var url;
var repo_url;


/**
* Create the signed merge commit
*/
function createMergeCommit(change_id){


}


/**
* Run the merge process 
*/
function runMergeProcess(change_id){

	getRevisionFiles(change_id, "current", function(result){
		//differentiate files between change and base branches
		var [added_files, deleted_files, modified_files] = 
			differentiate_blobs(result)

		console.log(added_files, deleted_files, modified_files)
		// Find involved trees/subtree in the merge
		var paths = added_files.concat(
			deleted_files, modified_files);
		var changed_dirs = getCommonDirs (paths);

		console.log(changed_dirs)
	});

}


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

		// Populate the parent window
		getParentInfo(project, branch)

		// Run the merge process
		runMergeProcess(change_id)

	})

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




	


