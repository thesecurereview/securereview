//Make a single api call
singleAPICall = function (endpoint, callback){

	var xhr = new XMLHttpRequest();
	xhr.onload = function(){
		callback(this.responseText, endpoint);
 	};

	xhr.open('get', endpoint, true);

	//Set Authorization
    	//xhr.setRequestHeader('Authorization', 'token ' + TOKEN);
    	xhr.setRequestHeader('Authorization', basicAuth(auth));

	xhr.send();
}


//Make multiple API calls 
multipleAPICall = function(urls, callbackMulti) {

	var data = {};
	for (var i=0; i<urls.length; i++) {
		var callback = function(responseText, apiURL) {

			data[apiURL] = responseText;

			//update the size of data
			var size = 0;
			for (var index in data) {
				if (data.hasOwnProperty(index))
					size ++;
			}

			if (size == urls.length){
				callbackMulti(data);
			}
		};

		singleAPICall(urls[i], callback);
	}
};


// Specific funciton to parse change info
function parseChangeInfo (data){

	//split it into lines
	data = data.split("\n")

	//remove the first and last line
	data.shift()
	data.pop()

	//join array of lines
	data = data.join("\n")
	data = JSON.parse(data);
	
	return data
}


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


// Get file content
function getFileContent(project, commitID, fname, callback){

	// Form query
	endpoint = "projects/" + project + 
		"/commits/" + commitID + "/files/" +
		 fname + "/content"

	/*endpoint = "projects/" + project + 
		"/branches/" + "master" + "/files/" +
		 fname + "/content"*/

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		console.log(atob(result))
		//callback (result)
	})

}


// Get the head of branch
function getBranchHead(project, branch, callback){

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
function getBranchInfo(project, branch, callback){

	getBranchHead(project, branch, function(result){
		// Get the details of the base branch
		getCommitInfo(project, result.revision, function(result){
			callback(result)
		});

	});
}


function getBranchTree(project, branch){

	var treeHash = "2508b6d186afb1829dd8510233a9c2b86ee8dd61"

	var endpoint = "projects/" + project + "/branches/master/trees/"
	endpoint = `${HOST_ADDR}/${endpoint}` //+ treeHash + "/content/"

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		console.log(result)
	})

}
