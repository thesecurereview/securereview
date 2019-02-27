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


// Get the head of change branch
function getCommitInfo(change_id, callback){

	// Form query
	endpoint = "changes/" + change_id + "/revisions/current/commit"

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})

}


// Extract parents from a commit object
function extractCommitParents (commitInfo){

	var parents = [];
	for (p in commitInfo.parents){
		parents.push(commitInfo.parents[p].commit)
	}

	return parents
}
