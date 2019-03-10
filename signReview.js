/*
- pop up a window to get the review information from the reviewer (score and comments)
- fetch the head of the change branch (downloading a packfile from server)
- extract the commit message and tree hash from head of the change branch (decompress the packfile)
- form a new commit message to embed review information
- create a new commit object (using the new commit message)
- push the new commit object to the server.
*/

var url;

/**
* From a review unit to store the reviews
*/
function storeReviewUnit (change_id, review, commitMessage, callback){

	// Embed review in the original commit message
	var reviewUnit = formReviewUnit (change_id, review);

	// Sign review
	signContent(authUsername, reviewUnit, function(result){

		// Embed signed reviewUnit in commitMessage
		commitMessage = embedReviewUnit(
				change_id, commitMessage, result);

		callback(commitMessage);
	});
}


/**
* Update Gerrit UI to reflect user's actions
*/
function setReview(change_id, head, data){

	endpoint = "changes/" + change_id + 
		"/revisions/" + head + "/review"
	post_review_endpoint("POST", PUT_URL, endpoint, auth, data,
		function (result){ 
		//console.log(result)
	})
}


/**
* Amend the head of change branch to embed reviews
*/
function amendChangeBranch (change_id,
		review, commitMessage){

	// Update the commit message
	var endpoint = "changes/" + change_id + "/edit:message"
	var method = "PUT"
	post_endpoint(method, PUT_URL, endpoint, auth, commitMessage, 
		function (result){ 
		parseMSGResponse(method, result)

		// Publish the update
		endpoint = "changes/" + change_id + "/edit:publish"
		method = "POST"
		post_endpoint(method, PUT_URL, endpoint, auth, null,
			function (result){ 
			parseMSGResponse(method, result)

			// Update UI
			review = formGerritReview(change_id, review)
			setReview(change_id, "current", review)
		})
	})

}


/**
* Run the signing review by 
* getting the basic info about the change
*/
function run(){
	
	// Get change number
	var cn = getChangeNumber (url) 
	getChangeSummary(cn, function(result){

		var project = result.project
		var branch = result.branch
		var change_id = result.change_id
		var changeNumber = result._number

		// Get the latest commit in the change branch
		getRevisionCommit(change_id, "current", function(commitInfo){

			// Get the target branch: if merge to master branch
			//var targetBranch = result.branch

			// Get base commit in the base branch
			var ancestors = extractParents (commitInfo);
			
			//var oldHead = commitInfo.commit;
			var parents = []
			parents.push(commitInfo.commit)
			
			// commit message
			var commitMessage = commitInfo.message;

			// Extract the review info
			var review = captureReview();

			// Store signed review in the change branch
			storeReviewUnit (change_id, review, commitMessage, function(result){

				//update the commit message
				commitMessage = result

				/* FIXME: How to update the change branch
				* 1- Update the change branch by pushing a new signed commit
				* 2- Update the commit message of change branch using API
				*/

				/*/ 1st approach complains about missing objects
				var oldHead = parents[0]
				getTreeHash (project, parents, function(treeHash){
					 pushCommit({ project, changeNumber, //branch, objects,
						parents, treeHash, commitMessage })
				});*/

				// 2nd approach works for now
				amendChangeBranch (change_id, review, commitMessage)
			})
		});


		
	});

}	


// Event Listeners
document.addEventListener('DOMContentLoaded', function () {

	chrome.tabs.query({active: true, currentWindow: true}, 
	function(tabs) {
		url = tabs[0].url;
	});

	/*sign the review*/
	document.getElementById('publish_review').addEventListener(
	'click', run);

});




	


