// Form fileEndpoints for a remote ref
function fileEndpoints(project, head, files){

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
	
	//TODO: Integrate with getBlobs (./objectParser), check if blob is already fetched

	// Fetch modified and added blobs
	//	- Modified: Take it for target, change and ca
	//	- Added: Take it only for change branch

	// If targetHead and caHead are not the same, fetch files for caHead
	let caRefs = []
	if  (parents.hasOwnProperty("caHead"))
		caRefs = fileEndpoints (project, parents.caHead,
			modified_files)
	let targetRefs = fileEndpoints (project, parents.targetHead,
			modified_files)
	let changeRefs = fileEndpoints (project, parents.changeHead, 
			[...added_files, ...modified_files])

	return [...targetRefs, ...changeRefs, ...caRefs]
}


// Fetch multiple blobs at once
var fetchBlobs = async function ({ urls } , callback){

	var blobContents = {};

	//TODO: Check the length before calling the function
	if (urls.length < 1)
		callback ({ blobContents });

	mutliCallback = function(data) {
		for(var item in data){

			var info = data[item];

			// Assign content to the proper fpath and ref
			let {fpath, ref} = getBlobInfo (item);

			// Initialize the sub-object, otherwise will get 'undefined' errors
			if(fpath in blobContents == false){
				blobContents[fpath] = {}; 
			}

			// Store content of file per ref (content is base64 decoded)
			blobContents [fpath][ref] = atob(info);

		}

		callback ({ blobContents });
	};

	multipleAPICall(urls, mutliCallback);
}


