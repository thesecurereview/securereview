/**
* Fetch multiple blobs at once
*/
function getBlobs (project, heads, files, callback){

	var refs = dictValues(heads)

	var endpoint = "projects/" + project + "/commits/"
	//+ commitID + "/files/" + fname + "/content"

	//Add repo URL to the endpoint
	endpoint = `${HOST_ADDR}/${endpoint}`

	// Form urls for each file, per revision
	var urls = [];
	for (var i=0; i < refs.length; i++){

		var uri = endpoint + refs[i] + "/files/"

		// Update urls with fname
		for (f in files){
			//Trim the file path
			f = filePathTrim(files[f])

			urls.push(uri + f + "/content");
		}
	}

	// Get all blobs at once
	var blobContents = {};
	mutliCallback = function(data) {
		for(var item in data){

			//var info = JSON.parse(data[item]);
			var info = data[item];

			// Assign content to the proper fpath and head
			var [fpath, head] = getBlobInfo (item);

			// Initialize the sub-object, otherwise will get 'undefined' errors
			if(fpath in blobContents == false){
				blobContents[fpath] = {}; 
			}

			// Store content of file per ref (content is base64 decoded)
			blobContents [fpath][head] = atob(info);
		}

		// All blobs are fetched, callback
		callback(blobContents)
	};

	multipleAPICall(urls, mutliCallback);
}
