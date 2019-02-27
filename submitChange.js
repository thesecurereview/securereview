/*
- Compare base and change branches
- Find the merge base commit (Common Ancestor)
- 
*/

var url;
var repo_url;

// Find the first commit in change branch
function findBaseCommit(change_id){
	// Form query
	endpoint = "changes/" + change_id + "XXXX"

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})
}

function createMergeCommit(){
	/*/ Find the first commit in change branch
	getChangeInfo(change_id, "1", function(result){
		console.log(result)
	});*/
}



/**
* Run the submitting merge by 
* comparing the base and change branches
*/
function run(){

	// Get change number
	var cn = getChangeNumber (url)
	console.log(cn)
	getChangeSummary(cn, function(result){
		console.log(result)
		var project = result.project
		var branch = result.branch
		var change_id = result.change_id
		var changeNumber = result._number

		getCurrentReview (change_id, function(result){
			console.log(result)
		})

		getChangeInfo(change_id, "current", function(result){
			console.log(result)
		})

		/*/ Get the latest commit in the base branch
		getBranchInfo(project, branch, function(result){

			// Get the details of the base branch
			getCommitInfo(project, result.revision, function(result){
				
				// Populate up the parent commit info
				setParentInfo (result)
				
				//Create signed merge commit
				createMergeCommit()
			});

		});*/

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




	


