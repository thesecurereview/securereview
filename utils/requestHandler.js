//HTTPBasic
function basicAuth (auth) {

	return "Basic " + btoa(auth.username + ':' + auth.password)
}


//Send request
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

	Object.keys(headers).forEach(function (name) {
		xhr.setRequestHeader(name, headers[name]);
	});

	xhr.onreadystatechange = function () {

		if (xhr.readyState !== 4) return;
		var resHeaders = {};
		
		xhr.getAllResponseHeaders().trim().split("\r\n").forEach(function (line) {
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


/**
* Create pify request
*/
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
			xhr.getAllResponseHeaders().trim().split("\r\n").forEach(function (line) {
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

		Object.keys(headers).forEach(function (name) {
			xhr.setRequestHeader(name, headers[name]);
		});

		if (resType !== null) {
			xhr.responseType = resType;
		}

		xhr.send(body);
	});
}


//GET request over an endpoint
function get_endpoint(repo_url, endpoint, auth, callback){

	let headers = {}
	if (auth) {
		headers['Authorization'] = basicAuth(auth)
	}

	repo_url = `${repo_url}/${endpoint}`

	request("GET", repo_url, headers, function(res){
		if (res.statusCode !== 200) {
			throw new Error(
			`HTTP Error: ${res.statusCode}`)
		}

		callback(res.body)
	})

}

//PUT/POST request over an endpoint
function post_endpoint(method, repo_url, endpoint, auth, 
		data, callback){

	let headers = {}
	if (auth) {
		headers['Authorization'] = basicAuth(auth)
	}
	headers['Accept'] = `application/json`

	repo_url = `${repo_url}/${endpoint}`

	pifyRequest(
		method,
		repo_url,
		headers, 
		null, //resType=null 
		data,
		function(res){
			callback(res)
		}
	);

}

//PUT/POST request over an endpoint
function post_review_endpoint(method, repo_url, endpoint, auth, 
		data, callback){

	let headers = {}
	if (auth) {
		headers['Authorization'] = basicAuth(auth)
	}
	headers['Accept'] = `application/json`
	headers['Content-Type'] = `application/json;charset=UTF-8`
	/*if (data instanceof FormData){
		headers['Content-type'] = `application/x-www-form-urlencoded`
	}
	else
		headers['Content-Type'] = `application/json`*/

	repo_url = `${repo_url}/${endpoint}`

	pifyRequest(
		method,
		repo_url,
		headers, 
		null, //resType=null 
		data,
		function(res){
			callback(res)
		}
	);

}


// GET request by service
function get_req(repo_url, service, auth, callback){

	if (!repo_url.endsWith('.git')) repo_url = repo_url += '.git'

	let headers = {}
	//FIXME Add OAuth
	if (auth) {
		headers['Authorization'] = basicAuth(auth)
	}

	repo_url = `${repo_url}/info/refs?service=${service}`
	
	request("GET", repo_url, headers, function(res){
		if (res.statusCode !== 200) {
			throw new Error(
			`HTTP Error: ${res.statusCode} ${res.statusMessage}`)
		}
		callback (parseGETResponse(res.body, service))
	})
}

// POST request by service
var post_req = async function (repo_url, service, auth, stream, callback) {

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
		function(res){
			if (res.statusCode !== 200) {
				throw new Error(`HTTP Error: `)//${res.statusCode} ${res.statusMessage}`)
			}

			//parse the response and then callback
			callback (res.body)
		}
	);

}



/**
* Send the pack file to the server
*/
var connect = async function (
	{ service, repo_url, auth, stream }, callback) {

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
		function(res){
			if (res.statusCode !== 200) {
				throw new Error(`HTTP Error: `)//${res.statusCode} ${res.statusMessage}`)
			}

			/*parse the response and then callback*/
			callback (res.body)
		}
	);

}

