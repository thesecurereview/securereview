// Fetch multiple data at once
var multiFetch = async function ({ urls, parser } , callback){

	var data = {};
	if (urls.length < 1)
		callback ({ data });

	mutliCallback = function(response) {
		for(var item in response){
			parser(item, response[item], data);
		}
		callback ({ data });
	};

	multipleAPICall(urls, mutliCallback);
}


// Make a single api call
singleAPICall = function (endpoint, callback){

	var xhr = new XMLHttpRequest();
	xhr.onload = function(){
		callback(this.responseText, endpoint);
 	};

	xhr.open('get', endpoint, true);
    	//xhr.setRequestHeader('Authorization', 'token ' + TOKEN);
    	xhr.setRequestHeader('Authorization', basicAuth(auth));

	xhr.send();
}


// Make multiple API calls 
multipleAPICall = function(urls, callbackMulti) {

	var data = {};
	for (var i=0; i<urls.length; i++) {
		var callback = function(responseText, endpoint) {

			data[endpoint] = responseText;

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


// Get basic info about the change
function getChangeSummary(cn, callback){

	var endpoint = "changes/?q=change:" + cn

	// fire get request to get a summary of change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		//It returns an array of one element
		callback (jsonifyResponse(result)[0])
	})

}


// Get the head of change branch
function getRevisionCommit(change_id, revision, callback){

	// Form query
	endpoint = "changes/" + change_id + 
		"/revisions/" + revision + "/commit"

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (jsonifyResponse(result))
	})

}


// Get details about the change
function getRevisionReview(change_id, revision, callback){

	// form query
	var endpoint = "changes/" + change_id + 
		"/revisions/" + revision + "/review"

	// fire get request to get all info about the change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (jsonifyResponse(result))
	})
	
}


// Get details about the change
function getRevisionFiles(change_id, revision, callback){

	// form query
	var endpoint = "changes/" + change_id + 
		"/revisions/" + revision + "/files"

	// fire get request to get all info about the change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (jsonifyResponse(result))
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


// Get the head of branch
function getBranchHead(project, branch, callback){

	// Form query
	endpoint = "projects/" + project + 
		"/branches/" + branch

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (jsonifyResponse(result))
	})

}


// Get the head of change branch
function getCommitInfo(project, commitID, callback){

	// Form query
	endpoint = "projects/" + project + 
		"/commits/" + commitID

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (jsonifyResponse(result))
	});
}


function getChangeRevisions (change_id, revisions, callback){

	let urls = formRevisionUrls (change_id, revisions);

	multiFetch({ urls}, ({ data }) => {
		callback(data)
	});
}


// Get the tree hash of a commit object
function getTree(project, commitID, callback){

	// Form query
	endpoint = "projects/" + project + 
		"/trees/" + commitID + "?recursive=1"

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		console.log(result)
		callback (jsonifyResponse(result))
	})
}
