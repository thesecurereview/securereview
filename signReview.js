/*
- pop up a window to get the review information from the reviewer (score and comments)
- fetch the head of the change branch (downloading a packfile from server)
- extract the commit message and tree hash from head of the change branch (decompress the packfile)
- form a new commit message to embed review information
- create a new commit object (using the new commit message)
- push the new commit object to the server.
*/

var url;
var repo_url;


// Fetch objects from the server
function fetchObjects(repo_url, wants, haves, callback){

	if (!repo_url.endsWith('.git')) repo_url += '.git'

	// Start git-upload-pack process
	get_req(repo_url, service, auth, function (result){

		//TODO: parse refs to set oids
		//TODO: parse capabilities
		var caps = result.capabilities;
		var refs = result.refs;

		// Ask for the objects (wants)
		post_req(repo_url, service, auth, wants, haves,
		function (result){
			callback(result)
		});
	});
}



// Get the tree hash of a commit object
function getTreeHash(head, parent, callback){

	/* FIXME: 
	 Assume we have the parent, and want the head
	 Assume wants = head, haves=parent

	wants = ["16d598f9639cbcaa1f2852d4e6e504b549404659"]
	haves = ["5087ff36f724487f77025a497b243ab6b8862c10"]
	*/

	// Pass the head and parent as an array	
	fetchObjects(repo_url, [head], [parent], function(result){
		// FIXME: decompress packfile to extract tree hash
		console.log(result)
		tree_hash = extract_commit_info(result)	

	});

}


// Create a sign commit object
function createSignedCommit(commitInfo, callback){

	// Form the commit 	
	var commit = formCommit(commitInfo.treeHash, commitInfo.author, 
		commitInfo.parents, commitInfo.commitMessage)

	// Sing the commit and then form signed commit
	signMessage(authUsername, commit, function(result){

		// Take the commit signature
		// Since the commitMessage itself has signature
		// We take the last signature as the commit signature
		// This approach should work, but FIXME: make sure about it 
		var signature = isolateSignature (result);

		//Form signed commit
		callback (formSignedCommit(commit, signature));
	});
}


// Push commit to the server
function pushCommit(changeNumber, oldHead, commit){

	// Create new signed commit
	var type = "commit";
	var obj = createGitObject(type, commit);
	var newHead = obj.id;


	var objects = [];
	objects.push([type, obj.object]);

	// Call send-pack to update the change branch
	sendPackLine(repo_url, auth, changeNumber, 
		newHead, oldHead, objects, 
		function(result){ 
			console.log(result)
			//parseSendPackResult (result)
		}
	);

}


//create a new commit and push to the server
function updateChangeBranch(author, parents, ancestors, 
		changeNumber, commitMessage){
	//FIXME get the tree_hash, 
	//getTreeHash (parents[0], exParents[0], function(treeHash){
		treeHash = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
		treeHash = "0764860a8e2f95435823440264486a3a99f6eb6d"
		//Create a new signed 
		createSignedCommit({
			treeHash:treeHash,
			parents:parents,
			author:author,  
			commitMessage:commitMessage
		}, function (signedCommit){
			//push the commit to the server
			pushCommit (changeNumber, parents[0], signedCommit)
		});

	//});
}


/**
* From a review unit to store the reviews
*/
function storeReviewUnit (change_id, review, commitMessage, callback){

	// Embed review in the original commit message
	var reviewUnit = formReviewUnit (change_id, review);

	// Sign review
	signMessage(authUsername, reviewUnit, function(result){

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
		var change_id = result.change_id
		var changeNumber = result._number

		// Form the repo URL
		repo_url = HOST_ADDR + "/" + project

		// Get the latest commit in the change branch
		getChangeInfo(change_id, "current", function(commitInfo){

			// Get the target branch: if merge to master branch
			//var targetBranch = result.branch

			// Get base commit in the base branch
			var ancestors = extractCommitParents (commitInfo);
			
			//var oldHead = commitInfo.commit;
			var parents = []
			parents.push(commitInfo.commit)
			
			// commit message
			var commitMessage = commitInfo.message;

			//FIXME get author info automatically
			var author = {name:authUsername, email:authEmail};

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

				// 1st approach complains about missing objects
				/*updateChangeBranch(author, parents, ancestors,
					changeNumber, commitMessage)*/

				// 2nd approach works for now
				amendChangeBranch (change_id, 
					review, commitMessage)
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




	


