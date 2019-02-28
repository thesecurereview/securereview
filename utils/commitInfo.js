// Get basic info about the change
function getChangeNumber(changeUrl){

	//check if url ends with "/", remove it
	if (changeUrl.endsWith('/')) changeUrl = changeUrl.slice(0,-1)
	
	/*
	* TODO: Find a reliable approach
	* From  <class="style-scope gr-change-view">
	*/
	return changeUrl.split("+/")[1].split("/")[0]
}


// Get basic info about the change
function getChangeSummary(cn, callback){

	var endpoint = "changes/?q=change:" + cn

	// fire get request to get a summary of change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		//It returns an array of one element
		callback (parseChangeInfo(result)[0])
	})

}


// Get the head of change branch
function getRevisionCommit(change_id, revision, callback){

	// Form query
	endpoint = "changes/" + change_id + 
		"/revisions/" + revision + "/commit"

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})

}


// Get details about the change
function getRevisionReview(change_id, revision, callback){

	// form query
	var endpoint = "changes/" + change_id + 
		"/revisions/" + revision + "/review"

	// fire get request to get all info about the change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})
	
}


// Get details about the change
function getRevisionFiles(change_id, revision, callback){

	// form query
	var endpoint = "changes/" + change_id + 
		"/revisions/" + revision + "/files"

	// fire get request to get all info about the change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})	
}


// Get the head of branch
function getBranchInfo(project, branch, callback){

	// Form query
	endpoint = "projects/" + project + 
		"/branches/" + branch

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})

}


// Get the head of change branch
function getCommitInfo(project, commitID, callback){

	// Form query
	endpoint = "projects/" + project + 
		"/commits/" + commitID

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})

}


// Get the head of a branch
function getParentInfo(project, branch, callback){

	getBranchInfo(project, branch, function(result){
		// Get the details of the base branch
		getCommitInfo(project, result.revision, 
			function(result){
			//Populate the window
			setParentInfo (result)
		});

	});
}

/**
* Populate the popup window with parent info
*/
function setParentInfo(commit) {
	
	var parent_info = '';

	parent_info += `author: ${commit.author.name} <${commit.author.email}> \n`
	parent_info += `committer: ${commit.committer.name} <${commit.committer.email}> \n`
	//parent_info += `date: ${get_standard_time(commit.author.date)}\n`
	parent_info += `date: ${commit.author.date}\n`
	parent_info += `message: ${commit.message}\n`

	/*fill the parent info form*/
	document.getElementById('parent_info').value = parent_info;
}


// Extract parents from a commit object
function extractCommitParents (commitInfo){

	var parents = [];
	for (p in commitInfo.parents){
		parents.push(commitInfo.parents[p].commit)
	}

	return parents
}
