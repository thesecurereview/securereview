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

		/*xhr.onload = function() {
			var status = xhr.status;

			var type = xhr.getResponseHeader('content-type') || '';

			var body = xhr.response;//Text;

			if (type.indexOf('application/json') !== -1) {
				try { body = JSON.parse(body); } catch(e) {}
			} else if ('response' in xhr) {
				body = xhr.response;
			}

			var resHeaders = {};
			xhr.getAllResponseHeaders().trim().split("\r\n").forEach(function (line) {
				var index = line.indexOf(":");
				resHeaders[line.substring(0, index).toLowerCase()] =
					 line.substring(index + 1).trim();
			});

			var options = {
				statusCode: status,
				statusText: xhr.statusText,
				headers: resHeaders,
				body: body
			};

			resolve(options);	
		};*/

		xhr.onreadystatechange = function() {
			if (xhr.readyState !== 4) return;

			/*var freshData = xhr.response.substr(xhr.seenBytes);
			xhr.seenBytes = xhr.responseText.length;*/
	
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
				//freshData: freshData,
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
	if (auth) {
		headers['Authorization'] = basicAuth(auth)
	}

	repo_url = `${repo_url}/info/refs?service=${service}`
	
	request("GET", repo_url, headers, function(res){
		if (res.statusCode !== 200) {
			throw new Error(
			`HTTP Error: ${res.statusCode}`)
		}
		callback(res.body)
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
* Discover the server
*/
var discover = async function ({ service, repo_url, auth }, callback) {

	if (!repo_url.endsWith('.git')) repo_url = repo_url += '.git'

	let headers = {}
	//FIXME Add OAuth
	if (auth) {
		headers['Authorization'] = basicAuth(auth)
	}
	
	//Send GET request
	request("GET", `${repo_url}/info/refs?service=${service}`, 
		headers, function(res){

		if (res.statusCode !== 200) {
			throw new Error(
			`HTTP Error: ${res.statusCode} ${res.statusMessage}`)
		}

		/*parse the response and then callback*/
		callback (parseGETResponse(res.body, service))
	});

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

	pifyRequest(
		"POST",
		`${repo_url}/${service}`,
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


// Parse GET response
function parseGETResponse(data, service){

	/*response lines
	* 0: <Length># service=git-receive-pack"
	" 1: <Length>SHA1 REF\0CAPS"
	" 2: <Length>SHA1 REF1"
	" 3: <Length>SHA1 REF2"
	" 4: <Length>SHA1 REF3"
	" ..."
	" n: 0000"
	*/

	/*
	* Check if the response is OK, and
	* remove the first and last line to get refs
	*/
	var lines = data.toString('utf8').trim().split('\n')

	// Determine the service data
	/*/ FIXME: make it automatic
	var server = "Gerrit" 
	var resHead;

	if (server == "Github")
		resHead = lines.shift()
	else if (server == "Gerrit")
		resHead = lines[0]
		resHead = lines.shift()
	*/

	var resHead = lines.shift()
	resHead = resHead.toString('utf8').replace(/\n$/, '')

	// Check the first line: service info
	if (! (resHead.includes(`service=${service}`)) ) {
		throw new Error(
			`Expected '# service=${service}\\n' 
			but got '${resHead.toString('utf8')}'`
		)
	}

	//Remove the last line: 0000
	lines.pop()
	
	let [refLine, capLine] = lines[0].split('\0')
	var capabilities = capLine.split(' ')

	//remove the first empty element, FIXME: check it for GitHub
	capabilities.shift()

	//remove caps from the first line
	lines[0] = refLine

	// Map over refs
	const refs = new Map()
	var symrefs = ""
	for (let line of lines) {
		let [ref, name] = line.split(' ')
		//remove the length from the beginning
		if (ref.length >40) ref = ref.slice(-40)
		refs.set(name, ref)	
	}

	// Check if there is Symrefs in capabilities.
	for (let i in capabilities) {
		if (capabilities[i].startsWith('symref=')) {
			symrefs = capabilities[i]
			symrefs = symrefs.replace("symref=", "");
			capabilities.splice(i,1)
		}
	}

	return {
		refs:refs, 
		symrefs:symrefs,
		capabilities:capabilities
		}
}


// Prase post response of packfile
function parsePackfileResponse(data){

	/*
	If 'side-band' or 'side-band-64k' capabilities have been specified by
	the client, the server will send the packfile data multiplexed.

	Each packet starting with the packet-line length of the amount of data
	that follows, followed by a single byte specifying the sideband the
	following data is coming in on.

	In 'side-band' mode, it will send up to 999 data bytes plus 1 control
	code, for a total of up to 1000 bytes in a pkt-line.  In 'side-band-64k'
	mode it will send up to 65519 data bytes plus 1 control code, for a
	total of up to 65520 bytes in a pkt-line.

	The sideband byte will be a '1', '2' or a '3'. Sideband '1' will contain
	packfile data, sideband '2' will be used for progress information that the
	client will generally print to stderr and sideband '3' is used for error
	information.

	If no 'side-band' capability was specified, the server will stream the
	entire packfile without multiplexing.
	*/

	// For now, we do not use side-band
	// So the the response format is following
	/*
	* 0: 008NAK\n" or "00000008NAK\n"
	" 1: PACK00000002..."
	*/	

	//Cut the first 8 or 12 bytes
	// if Response is string
	if (typeof(data) == "string"){
		// data = data.substr(8) // "008NAK\n"
		data = data.substr(12) //"00000008NAK\n"
	}
	else{
		// if Response is arraybuffer
		data = new Uint8Array(data);
		//data = data.slice(8, data.byteLength) // "008NAK\n"
		data = data.slice(12, data.byteLength) //"00000008NAK\n"
	}

	return data
}


//Parse
function parseMSGResponse(method, res){

	if (method == "PUT"){
		// Check for 204 No Content success code
		if (res.statusCode == 204) {
			return true
		}
		/*else
			//FIXME raise a better error
			return throw new Error(`The commit message is not updated`)
		*/
	}
	if (method == "POST"){
		// Check for 204 No Content success code
		if (res.statusCode == 204) {
			return refreshPage(url)
		}
		/*else
			//FIXME raise a better error
			return throw new Error(`The updated message is not published`)
		*/
	}
}


/**
* Parse the final server's response
*/
var parseSendPackResult = function (response){

	/*FIXME check response lines
	let lines = response.split('\n')

	if (!line.startsWith('unpack ')) {
		window.alert(line)
	}*/

	if (!response.includes('unpack ')) {
		window.alert(line)
	}
	else{
		//refresh the page If the unpack is ok
		//refreshPage(file_name)
	}

}


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


