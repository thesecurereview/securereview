//HTTPBasic
function basicAuth (auth) {

	return "Basic " + btoa(auth.username + ':' + auth.password)
}


//Send request
function request(method, url, headers, body, callback) {

	if (typeof body === "function") {
		callback = body;
		body = undefined;
	}

	if (!callback) {
		return request.bind(null, method, url, headers, body);
	}

	var xhr = new XMLHttpRequest();
	xhr.open(method, url, true);

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
function pifyRequest(method, url, headers, body, callback) {

	if (typeof body === "function") {
		callback = body;
		body = undefined;
	}

	if (!callback) {
		return request.bind(null, method, url, headers, body);
	}

	return new Promise(function(resolve, reject) {
		var xhr = new XMLHttpRequest();

		xhr.onload = function() {
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
		};

		xhr.onreadystatechange = function() {
			if (xhr.readyState !== 4) return;

			var freshData = xhr.response.substr(xhr.seenBytes);
			xhr.seenBytes = xhr.responseText.length;
	
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
				freshData: freshData,
				body: xhr.response
			});

		};


		xhr.open(method, url, true);
		//xhr.responseType = 'arraybuffer';


		Object.keys(headers).forEach(function (name) {
			xhr.setRequestHeader(name, headers[name]);
		});

		xhr.send(body);
	});
}


//GET request over an endpoint
function get_endpoint(url, endpoint, auth, callback){

	let headers = {}
	if (auth) {
		headers['Authorization'] = basicAuth(auth)
	}

	url = `${url}/${endpoint}`

	request("GET", url, headers, function(res){
		if (res.statusCode !== 200) {
			throw new Error(
			`HTTP Error: ${res.statusCode}`)
		}

		callback(res.body)
	})

}

//GET request over an endpoint
function post_endpoint(url, endpoint, auth, data, callback){

	let headers = {}
	headers['Accept'] = `application/json`
	if (auth) {
		headers['Authorization'] = basicAuth(auth)
	}

	url = `${url}/${endpoint}`
	console.log(url)

	/*data = {
		"message": data
	}*/

	pifyRequest("PUT", url, headers, data, function(res){

		/*if (res.statusCode !== 200) {
			throw new Error(`HTTP Error: ${res.statusCode}`)
		}*/
		callback(res.body)
	});

}


// GET request by service
function get_req(url, service, auth, callback){

	let headers = {}
	if (auth) {
		headers['Authorization'] = basicAuth(auth)
	}

	url = `${url}/info/refs?service=${service}`
	
	request("GET", url, headers, function(res){
		if (res.statusCode !== 200) {
			throw new Error(
			`HTTP Error: ${res.statusCode}`)
		}
		callback(
			parseGETResponse(res.body, service)
		)
	})
}


// POST request by service
function post_req(url, service, auth, wants, haves, callback){

	let headers = {}
	headers['Content-Type'] = `application/x-${service}-request`
	headers['Accept'] = `application/x-${service}-result`

	if (auth) {
		headers['Authorization'] = basicAuth(auth)
	}

	url = `${url}/${service}`

	/*create the pack stream*/
	packstream = wantPackLine (wants, haves)

	//concat the packstream
	let conStream = concatStreamBuffer(packstream)

	pifyRequest("POST", url, headers, conStream, function(res){

		/*if (res.statusCode !== 200) {
			throw new Error(`HTTP Error: ${res.statusCode}`)
		}*/
		callback(parsePOSTResponse(res.body, service))
	});
	
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

	pifyRequest("POST", `${repo_url}/${service}`, 
		headers, conStream, function(res){

		if (res.statusCode !== 200) {
			throw new Error(`HTTP Error: `)//${res.statusCode} ${res.statusMessage}`)
		}

		/*parse the response and then callback*/
		callback (res.body)
	});

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


/**
* Parse the final server's response
*/
var parseSendPackResult = function (response){

	console.log(response);

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
	*/

	// Check the first line: service info
	var resHead = lines.shift()
	if (! (resHead.toString('utf8').includes(`service=${service}`)) ) {
		throw new Error(
			`Expected '# service=${service}\\n' 
			but got '${resHead.toString('utf8')}'`
		)
	}

	//Remove the last line (0000
	lines.pop()
	
	let [refLine, capLine] = lines[0].split('\0')
	var capabilities = capLine.split(' ')
	//remove the first empty element, FIXME: check it for GitHub
	capabilities.shift()

	//remove caps from the first line
	lines[0] = refLine

	// Map over refs
	const refs = new Map()
	for (let line of lines) {
		let [ref, name] = line.split(' ')
		//remove the length from the beginning
		if (ref.length >40) ref = ref.slice(-40)
		refs.set(name, ref)	
	}

	return { capabilities, refs }
}


// Parse GET response
function parsePOSTResponse(data, service){

	/*response lines
	* 0: 008NAK\n"
	" 1: PACK00000002"
	" ..."
	" n: 0000"
	*/

	/*
	* Check if the response is OK, and
	* remove the first and last line to get refs
	*/
	
	//remove the first line 008NAK\n, the rest is the packfile
	data = data.substr(8)

	//[0, 4] : PACK
	pack = data.slice(0,4)
	buffer = createBuffer(pack)
	console.log(buffer.toString())
	//[4, 8] : Packfile version
	version = data.slice(4, 8)
	buffer = createBuffer(version)
	console.log(buffer.toString('hex'))
	//[8, 12] : Number of entries
	entries = data.slice(8, 12)
	buffer = createBuffer(entries)
	console.log(buffer.toString('hex'))

	//remove the sig, version, entries
	data = data.substr(12)

	//remove the last 20B, sha1
	data = data.slice(0, -20)

	//convert the input to byte
	var arrayBuffer = str2ab(data)
	var uint8View = new Uint8Array(arrayBuffer);
	//console.log(arrayBuffer)
	//console.log(uint8View)

	//decompress the data
	pako = getPako()
	data = pako.inflate(data, { raw: true});
	console.log(data)

}


//readableBuffer
function rdb (data){
	buffer = createBuffer(data)
	return buffer.toString('2')
}



function b64DecodeUnicode(str) {
	return (str.split('').map(function(c) {
		//return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
		return '' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
	}).join(''));
}

var zeroPad = function(num) {
    return "00000000".slice(String(num).length) + num
}

// Decode base64 (convert ascii to binary)
var asciiToBinary = function(str) {
	return str.replace(/[\s\S]/g, function(str) {
		str = zeroPad(str.charCodeAt().toString(2));
		return str
	})
}


function asciiToChar (a) {return a.charCodeAt(0); }

// Convert binary string to character-number array
var charData = function(strData){
	return strData.split('').map(function(x){return x.charCodeAt(0);});
}

function testPako(){
	pako = getPako()

	let data = { ping: "12345678" };

	let json = JSON.stringify(data);
	console.log(json);

	let binStr = pako.deflate(json);
	console.log(binStr);

	let text = pako.inflate(binStr);
	console.log(text);

	console.log(String.fromCharCode.apply(null, text));

}


function hex_to_bytes(hex) {
	var bytes = []
	for (i = 0; i < hex.length; i+=2) {
		var ch = parseInt(hex.substr(i, 2), 16);
		bytes.push(ch); 
	}
	res = new Uint8Array(bytes);
	return res.buffer;
}


function ab2str(buf) {
	return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab(str) {
	var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
	var bufView = new Uint16Array(buf);
	for (var i=0, strLen=str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}


function saveFile(dat){
$http({
    url: 'your/webservice',
    method: 'POST',
    responseType: 'arraybuffer',
    data: json, //this is your json data string
    headers: {
        'Content-type': 'application/json',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
}).success(function(data){
    var blob = new Blob([data], {
        type: `application/x-${service}-request`
    });
    saveAs(blob, 'testPack' + '.pack');
}).error(function(){
    //Some error log
});

}

