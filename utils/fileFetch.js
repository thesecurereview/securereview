// Form fileurls for a remote ref
function fileUrls(project, head, files){

	var endpoint = "projects/" + project + "/commits/"
	//+ commitID + "/files/" + fname + "/content"

	//Add repo URL and branch head to the endpoint
	endpoint = `${HOST_ADDR}/${endpoint}` + head + "/files/"

	// Update urls with fname
	let urls = [];
	for (f in files){
		//Trim the file path
		f = filePathTrim(files[f])

		urls.push(endpoint + f + "/content");
	}

	return urls
} 


// Form urls for all files need to be fetched 
function formFileUrls (project, parents, 
		added_files, modified_files){
	
	//TODO: use getBlobs in ./objectParser to check if the blob is already fetched
	
	// Get files: only modified for base branch, added and modified for change branch
	let uris = fileUrls (project, parents.baseHead,
			modified_files)
	let urls = fileUrls (project, parents.changeHead, 
			[...added_files, ...modified_files])

	return [...uris, ...urls]
}


// Fetch multiple blobs at once
var fetchBlobs = async function ({ urls } , callback){

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
		callback ({ blobContents });
	};

	multipleAPICall(urls, mutliCallback);
}


