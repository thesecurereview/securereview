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
var objects = [];
var revisions_info;


// Extract the review information: comments, score
function captureReview(){

	var comments = document.getElementById('comments').value;
	var score = document.querySelector(
		'input[name = "Code-Review"]:checked').value;

	return {comments:comments, 
		score:score};
}


function extractCommitParents (commitInfo){

	var parents = [];
	for (p in commitInfo.parents){
		parents.push(commitInfo.parents[p].commit)
	}

	return parents
}


// Get basic info about the change
function getChangeSummary(changeUrl, callback){

	//check if url ends with "/", remove it
	if (changeUrl.endsWith('/')) changeUrl = changeUrl.slice(0,-1)
	
	//get the change number and form query
	var cn = changeUrl.split("/").slice(-1)[0]
	var endpoint = "changes/?q=change:" + cn

	// fire get request to get a summary of change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		//It returns an array of one element
		callback (parseChangeInfo(result)[0])
	})

}


// Get basic info about the change
function getChangeInfo(change_id, callback){

	// form query
	var endpoint = "changes/" + change_id + "/revisions/current/review"

	// fire get request to get all info about the change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})
	
}


// Get the head of change branch
function getCommitInfo(change_id, callback){

	// form query
	endpoint = "changes/" + change_id + "/revisions/current/commit"

	// fire get request to get all info about the change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})

}


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



// Store review in the change branch
function getTreeHash(head, parent, callback){

	/* FIXME: 
	 Assume we have the parent, and want the head
	 Assume wants = head, haves=parent

	wants = ["16d598f9639cbcaa1f2852d4e6e504b549404659"]
	haves = ["5087ff36f724487f77025a497b243ab6b8862c10"]
	*/

	/*/ Pass the head and parent as an array	
	fetchObjects(repo_url, [head], [parent], function(result){
		// FIXME: decompress packfile to extract tree hash
		console.log(result)
		tree_hash = extract_commit_info(result)	

	});*/

	callback ("0764860a8e2f95435823440264486a3a99f6eb6d")
}



// From a review unit to store the reviews
function storeSignedReview (change_id, commitMessage, callback){

	// Extract the review info
	var review = captureReview();

	// Embed review in the original commit message
	var reviewUnit = formReviewUnit (change_id, review);

	// Sign review
	signMessage(authUsername, reviewUnit, function(result){

		//Embed signed reviewUnit in commitMessage
		commitMessage = embedReviewUnit(
				change_id, commitMessage, result);

		callback(commitMessage);
	});
}


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


//Push commit to the server
function pushCommit(changeNumber, oldHead, commit){

	//create new signed commit
	var type = "commit";
	var obj = createGitObject(type, commit);
	var newHead = obj.id;

	objects.push([type, obj.object]);

	//call send-pack process to update the change branch
	sendPackLine(repo_url, auth, changeNumber, 
		newHead, oldHead, objects, 
		function(result){ 
			console.log(result)
			//parseSendPackResult (result)
		}
	);

}


//create a new commit and push to the server
function updateChangeBranch(oldHead, author, parents, 
		changeNumber, commitMessage){
	//get the tree_hash, 
	getTreeHash (oldHead, parents[0], function(tree_hash){

		//Create a new signed 
		createSignedCommit({
			treeHash: tree_hash,
			parents:parents,
			author:author,  
			commitMessage:commitMessage
		}, function (signedCommit){
			//push the commit to the server
			pushCommit (changeNumber, oldHead, signedCommit)
		});

	});
}


function updateCommitMessage (change_id, 
		changeNumber, commitMessage){

	// update the commit message
	var endpoint = "changes/" + change_id + "/edit:message"
	var method = "PUT"
	post_endpoint(method, PUT_URL, endpoint, auth, commitMessage, 
		function (result){ 
		// FIXME Parse response as an if condition
		parseMSGResponse(method, result)

		// publish the update
		endpoint = "changes/" + change_id + "/edit:publish"
		method = "POST"
		post_endpoint("POST", PUT_URL, endpoint, auth, null,
			function (result){ 
			// FIXME Parse response as an if condition
			parseMSGResponse(method, result)
		})

	})

}

// Run the signing review by getting the basic info about the change
function run(){

	getChangeSummary(url, function(result){

		var changeNumber = result._number

		var project = result.project
		var change_id = result.change_id

		// Form repo URL
		repo_url = HOST_ADDR + "/" + project

		// Get all info about the change
		getChangeInfo(change_id, function(result){
			let change_head = result.current_revision
			revisions_info = result.revisions[change_head]
		});

		// get commit info about change branch
		getCommitInfo(change_id, function(commitInfo){

			//target branch if we merge to master branch
			//var targetBranch = result.branch

			// parents
			var parents = extractCommitParents (commitInfo);
			
			// commit Sha1
			var oldHead = commitInfo.commit;
			
			// commit message
			var commitMessage = commitInfo.message;

			//FIXME get author info automatically
			var author = {name:authUsername, email:authEmail};

			// store signed review in the change branch
			storeSignedReview (change_id, commitMessage, function(result){

				//update the commit message with the new one
				commitMessage = result

				// FIXME: How to update the change
				// 1- Update the change branch by pushing a new signed commit
				// 2- Update the commit message using API

				// The first approach complains about missing tree
				/*updateChangeBranch(oldHead, author, parents, 
					changeNumber, commitMessage)*/

				// Let's try the 2nd one for now	
				updateCommitMessage (change_id, changeNumber, commitMessage)

			})
		});
	});

}	


//Event Listeners
document.addEventListener('DOMContentLoaded', function () {

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		url = tabs[0].url;
	});

	/*sign the review*/
	document.getElementById('publish_review').addEventListener(
	'click', run);

});




	


