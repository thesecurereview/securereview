var url;

function getChangeInfo(url){


}


//sign the review, embed it into the change branch
function sign_review(url){

	//changeInfo = getChangeInfo(url)

	url = "http://hmdfsn@localhost:8889/test_api.git"

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

}	


/*merge the change to the base branch*/
function submit_change(){

}


//Event Listeners
document.addEventListener('DOMContentLoaded', function () {

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		var tab = tabs[0];
		url = tab.url;
		/*only works on web-based gerrit services 
		if (url.indexOf(HOST_ADDR) == -1){
			deactivated_message();
			return;
		}
		
		else{ 
-                       //find out the commit type and perform the commit
			detect_commit_type();
		}*/

	});

	/*sign the review*/
	document.getElementById('sign_review').addEventListener(
	'click', sign_review(url));

	/*submit the change to the server*/
	document.getElementById('submit_change').addEventListener(
	'click', submit_change);


});




	


