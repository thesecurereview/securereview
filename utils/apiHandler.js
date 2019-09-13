// Make a single api call
singleAPICall = function(endpoint, callback) {
    get_endpoint({endpoint, auth}, function(result) {
        callback (result, endpoint)
    })
}


// Make multiple API calls 
multipleAPICall = function(urls, callbackMulti) {
    var data = {};
    for (var i = 0; i < urls.length; i++) {
        var callback = function(response, endpoint) {
		var size = 0;
		data[endpoint] = response;
		//update the size of data
		for (var index in data) {
			if (data.hasOwnProperty(index))
			    size++;
			}
		if (size == urls.length) {
			callbackMulti(data);
		}
        };

        singleAPICall(urls[i], callback);
    }
}


// Fetch multiple data at once
var multiFetch = async function({
    urls,
    parser
}, callback) {

    var data = {};
    if (urls.length < 1)
        callback({
            data
        });

    mutliCallback = function(response) {
        for (var item in response) {
            parser({item, info:response[item], data});
        }
        callback({
            data
        });
    };

    multipleAPICall(urls, mutliCallback);
}


// Get the summary of a change
function getChangeSummary(cn, callback) {

    let endpoint = `${HOST_ADDR}/changes/?q=change:${cn}`;
    get_endpoint({endpoint, auth}, function(result) {
        //It returns an array of one element
        callback(jsonifyResponse(result)[0])
    })
}


// Get the head of revision
function getRevisionCommit(change_id, revision, callback) {

    let endpoint = `${HOST_ADDR}/changes/${change_id}/revisions/${revision}/commit`;
    get_endpoint({endpoint, auth}, function(result) {
        callback(jsonifyResponse(result))
    })
}


// Get reviews for a change
function getRevisionReview(change_id, revision, callback) {

    let endpoint = `${HOST_ADDR}/changes/${change_id}/revisions/${revision}/review`;
    get_endpoint({endpoint, auth}, function(result) {
        callback(jsonifyResponse(result))
    })
}


// Get details about files changed under a revision
function getRevisionFiles(change_id, revision, callback) {

    let endpoint = `${HOST_ADDR}/changes/${change_id}/revisions/${revision}/files`;
    get_endpoint({endpoint, auth}, function(result) {
        callback(jsonifyResponse(result))
    })
}


// Get the info about a commit
function getCommitInfo(project, commitID, callback) {

    let endpoint = `${HOST_ADDR}/projects/${project}/commits/${commitID}`;
    get_endpoint({endpoint, auth}, function(result) {
        callback(jsonifyResponse(result))
    });
}


// Get the head of branch
function getBranchHead(project, branch, callback) {

    let endpoint = `${HOST_ADDR}/projects/${project}/branches/${branch}`;
    get_endpoint({endpoint, auth}, function(result) {
        callback(jsonifyResponse(result))
    })
}


// Get the info about a branch
function getBranchInfo(project, branch, callback) {

    getBranchHead(project, branch, function(result) {
        // Get the details of the base branch
        getCommitInfo(project, result.revision, function(result) {
            callback(result)
        });
    });
}


// Get all revisions for a change
function getChangeRevisions(change_id, revisions, callback) {

    let urls = formRevisionUrls(change_id, revisions);
    multiFetch({
        urls
    }, ({
        data
    }) => {
        callback(data)
    });
}
