
//Prepare GET request
function get_req(url, service, auth, callback){

	if (!url.endsWith('.git')) url += '.git'

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
			parseGETResponse(res.body)
		)
	})
}


//Prepare POST request
function post_req(url, service, auth, wants, haves, callback){

	if (!url.endsWith('.git')) url += '.git'

	let headers = {}
	headers['Content-Type'] = `application/x-${service}-request`
	headers['Accept'] = `application/x-${service}-result`

	url = `${url}/${service}`

	/*create the pack stream*/
	packstream = wantPackLine (wants, haves)

	//concat the packstream
	let conStream = concatStreamBuffer(packstream)

	pifyRequest("POST", url, headers, conStream, function(res){

		if (res.statusCode !== 200) {
			throw new Error(`HTTP Error: ${res.statusCode}`)
		}
		//console.log(res.headers)
		callback(parsePOSTResponse(res.body))
	});
	
}


function main(){
	var url = "http://hmdfsn@localhost:8889/test_api.git"
	//url = "https://github.com/fsnfsn/test_api.git"
	let auth = {
		username: authUsername,
		password: authPassword
	}

	//get the tree
	get_req(url, service, auth, function (result){
		var caps = result.capabilities
		var refs =result.refs

		//Find the head of the change branch

		//TODO: parse refs to set oids
		//TODO: parse capabilities
		let wants = ["5087ff36f724487f77025a497b243ab6b8862c10"]
		let haves = ["16d598f9639cbcaa1f2852d4e6e504b549404659"]
		post_req(url, service, auth, wants, haves, function (result){
			//console.log(result)
		})
	})

	//update the head of change branch


	//submit the change

}	


function findValueByPrefix(object, prefix) {
	for (var property in object) {
		if (object.hasOwnProperty(property) && 
			property.toString().includes(prefix)) {
			return object[property];
		}
	}
}

//Event Listeners
document.addEventListener('DOMContentLoaded', function () {

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		
		main();
	});


});




	


