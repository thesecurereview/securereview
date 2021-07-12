//TODO: Show proper messages if request is not authorized!

// Make a single API call
var singleAPICall = function({
    endpoint,
    json
}, callback) {
    var request = new XMLHttpRequest();
    request.onload = function() {
        //jsonify the response unless users not ask
        let response = json == false ? this.responseText :
            JSON.parse(this.responseText);
        callback({
            endpoint,
            response
        });
    };

    request.open('get', endpoint, true);
    if (SERVER == SERVER_GH)
        request.setRequestHeader('Authorization', `token ${AUTH.token}`);
        //request.setRequestHeader('Authorization', `Bearer ${AUTH.token}`)//GITLAB
    request.send();
}

// Make multiple API calls 
var multipleAPICall = function({
    urls,
    json
}, callbackMulti) {
    var data = {};
    for (var i = 0; i < urls.length; i++) {
        var callback = ({
            endpoint,
            response
        }) => {
            data[endpoint] = response;
            var size = 0;
            for (var index in data) {
                if (data.hasOwnProperty(index))
                    size++;
            }

            if (size == urls.length) {
                callbackMulti(data);
            }
        };
        singleAPICall({
            endpoint: urls[i],
            json
        }, callback);
    }
}


// Fetch data from multiple endpoints at once
var multiFetch = function({
    urls,
    parser,
    json
}, callback) {
    var data = {};
    if (urls.length < 1)
        callback({
            data
        });

    var mutliCallback = function(res) {
        for (var item in res) {
            parser({
                item,
                info: res[item],
                data
            });
        }
        callback({
            data
        });
    };

    multipleAPICall({
        urls,
        json
    }, mutliCallback);
}


// Compare the head of a branch
function getPRSummary({
    prId
}, callback) {
    let endpoint = `${REPO_API}/pulls/${prId}`;
    singleAPICall({
        endpoint
    }, ({
        response
    }) => {
        callback(response);
    });
}


// get the commit
function getCommit({
    commit
}, callback) {
    let endpoint = `${REPO_API}/commits/${commit}`;
    singleAPICall({
        endpoint
    }, ({
        response
    }) => {
        callback(response);
    });
}

// get the commit
function getPRCommits({
    prId
}, callback) {
    let endpoint = `${REPO_API}/pulls/${prId}/commits`;
    singleAPICall({
        endpoint
    }, ({
        response
    }) => {
        callback(response);
    });
}
