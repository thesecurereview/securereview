//HTTPBasic
function basicAuth(auth) {
    //FIXME Add OAuth
    return "Basic " + btoa(auth.username + ':' + auth.password)
}


// Create XMLHttpRequest
function request(method, repo_url, headers, body, callback) {
    if (typeof body === "function") {
        callback = body;
        body = undefined;
    }

    if (!callback) {
        return request.bind(null, method, repo_url, headers, body);
    }

    var xhr = new XMLHttpRequest();
    xhr.open(method, repo_url, true);

    Object.keys(headers).forEach(function(name) {
        xhr.setRequestHeader(name, headers[name]);
    });

    xhr.onreadystatechange = function() {

        if (xhr.readyState !== 4) return;
        var resHeaders = {};

        xhr.getAllResponseHeaders().trim().split("\r\n").forEach(function(line) {
            var index = line.indexOf(":");
            resHeaders[line.substring(0, index).toLowerCase()] = line.substring(index + 1).trim();
        });

        callback({
            statusCode: xhr.status,
            headers: resHeaders,
            body: xhr.response,
        });

    };

    xhr.send();
}


// Create pify request
function pifyRequest(method, repo_url, headers, resType, body, callback) {

    if (typeof body === "function") {
        callback = body;
        body = undefined;
    }

    if (!callback) {
        return request.bind(method, repo_url, headers, body);
    }

    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) return;

            var resHeaders = {};
            xhr.getAllResponseHeaders().trim().split("\r\n").forEach(function(line) {
                var index = line.indexOf(":");
                resHeaders[line.substring(0, index).toLowerCase()] =
                    line.substring(index + 1).trim();
            });

            callback({
                statusCode: xhr.status,
                statusText: xhr.statusText,
                headers: resHeaders,
                body: xhr.response
            });
        };

        xhr.open(method, repo_url, true);

        Object.keys(headers).forEach(function(name) {
            xhr.setRequestHeader(name, headers[name]);
        });

        if (resType !== null) {
            xhr.responseType = resType;
        }

        xhr.send(body);
    });
}


// GET request over an endpoint
function get_endpoint({
    endpoint,
    auth,
    resType
}, callback) {

    let headers = {}
    if (auth) {
        headers['Authorization'] = basicAuth(auth)
    }
    headers['Accept'] = `application/json`

    request("GET", endpoint, headers, function(res) {
        callback(res.body)
    });
}


// PUT/POST request over an endpoint
function post_endpoint({
    auth,
    data,
    method,
    endpoint,
    contentType
}, callback) {

    let headers = {}
    if (auth) {
        headers['Authorization'] = basicAuth(auth);
    }
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    headers['Accept'] = `application/json`;

    pifyRequest(
        method,
        endpoint,
        headers,
        null, //resType=null 
        data,
        (res) => {
            callback(res);
        }
    );
}


// GET request by service
function get_req(repo_url, service, auth, callback) {

    if (!repo_url.endsWith('.git')) repo_url = repo_url += '.git'

    let headers = {}
    if (auth) {
        headers['Authorization'] = basicAuth(auth);
    }

    repo_url = `${repo_url}/info/refs?service=${service}`;

    request("GET", repo_url, headers, (res) => {
        if (res.statusCode !== 200) {
            throw new Error(
                `HTTP Error: ${res.statusCode} ${res.statusMessage}`)
        }
	// parse the response and then callback
        callback(parseGETResponse(res.body, service));
    })
}


// POST request by service
var post_req = async function(repo_url, service, auth, stream, callback) {

    if (!repo_url.endsWith('.git')) repo_url = repo_url += '.git'

    let headers = {}
    headers['Content-Type'] = `application/x-${service}-request`
    headers['Accept'] = `application/x-${service}-result`

    if (auth) {
        headers['Authorization'] = basicAuth(auth)
    }

    let conStream = concatStreamBuffer(stream)

    repo_url = `${repo_url}/${service}`

    pifyRequest(
        "POST",
        repo_url,
        headers,
        "arraybuffer",
        conStream,
        (res) => {
            if (res.statusCode !== 200) {
                throw new Error(`HTTP Error: `)
            }
            //parse the response and then callback
            callback(res.body)
        }
    );

}


// Send the pack file to the server
var connect = async function({
    service,
    repo_url,
    auth,
    stream
}, callback) {

    if (!repo_url.endsWith('.git')) repo_url = repo_url += '.git'

    let headers = {}
    headers['Content-Type'] = `application/x-${service}-request`
    headers['Accept'] = `application/x-${service}-result`

    if (auth) {
        headers['Authorization'] = basicAuth(auth)
    }

    let conStream = concatStreamBuffer(stream)

    repo_url = `${repo_url}/${service}`

    pifyRequest(
        "POST",
        repo_url,
        headers,
        null, //resType=null 
        conStream,
        (res) => {
            if (res.statusCode !== 200) {
                throw new Error(`HTTP Error: `) //${res.statusCode} ${res.statusMessage}`)
            }
            // parse the response and then callback
            callback(res.body)
        }
    );
}
