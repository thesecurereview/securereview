/*
- pop up a window to get the review information from the reviewer (score and comments)
- fetch the head of the change branch (downloading a packfile from server)
- extract the commit message and tree hash from head of the change branch (decompress the packfile)
- form a new commit message to embed review information
- create a new commit object (using the new commit message)
- push the new commit object to the server.
*/

var url;
var repo_url;


function sign_review(){
	
	//chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//		url = tabs[0].url;

		//extract review info
		//FIXME
		var comments, score;
		[comments, score] = extract_review();

		/*/get the object from the server
		wants = ["16d598f9639cbcaa1f2852d4e6e504b549404659"]
		haves = ["5087ff36f724487f77025a497b243ab6b8862c10"]


		getChangeInfo(url, function(result){
			console.log(result)
			project = result.project
			change_id = result.change_id
 
			repo_url = HOST_ADDR + "/" + project
			fetch_objects(repo_url, wants, haves, function(result){
				//console.log(result)
				//tree_hash = get_tree_hash(result)	
				//FIXME
				tree_hash = "16d598f9639cbcaa1f2852d4e6e504b549404659"
				
			})
		})*/

	//});

}	


/*merge the change to the base branch*/
function submit_change(){

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		url = tabs[0].url;

		getChangeInfo(url, function(result){
			console.log(result)
			project = result.project
			change_id = result.change_id

			var endpoint = "changes/" + change_id + "/submit"
			get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
				callback (result)
			})
		})


	});

}


//Event Listeners
document.addEventListener('DOMContentLoaded', function () {

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		url = tabs[0].url;

	});

	/*sign the review*/
	document.getElementById('merge_change').addEventListener(
	'click', sign_review());

});




	


