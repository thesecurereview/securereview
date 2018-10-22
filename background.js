//HTTPBasic
function basicAuth (auth) {

	return "Basic " + btoa(auth.username + ':' + auth.password)
}


/**
* create pify HTTP request
*/
function pifyRequest(method, repo_url, headers, body, callback) {

	if (typeof body === "function") {
		callback = body;
		body = undefined;
	}

	if (!callback) {
		return request.bind(null, method, repo_url, headers, body);
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
				//freshData: freshData,
				body: xhr.response
			});

		};


		xhr.open(method, repo_url, true);

		Object.keys(headers).forEach(function (name) {
			xhr.setRequestHeader(name, headers[name]);
		});

		xhr.send(body);
	});
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

//Prepare request
function get_req(url, service, auth){

	if (!url.endsWith('.git')) url += '.git'

	let headers = {}
	if (auth) {
		headers['Authorization'] = basicAuth(auth)
	}

	url = `${url}/info/refs?service=${service}`
	
	request("GET", url, headers, function(res){
		console.log(res.body)
	})
}


function post_req(){


}


function main(){
	var url = "http://hmdfsn@localhost:8889/test_api.git"
	var service = 'git-receive-pack'
	var service = 'git-upload-pack'
	var authUsername= 'hmdfsn'
	var authPassword = "YGA8OuKqH8/szn5CsH/s7nW+aAoWrJPgXCrDBDywVw"

	let auth = {
		username: authUsername,
		password: authPassword
	}

	get_req(url, service, auth)

}


//Event Listeners
document.addEventListener('DOMContentLoaded', function () {

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		
		main();
	});


});




	


