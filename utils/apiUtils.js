// Form urls for all trees need to be fetched
function formTreeUrls(project, parents, dirs){
	/**
	 * To create the merge commit, we need only trees of base and pr
	 * No need to get the tree of common ancestor
	 **/
	let trees = {
		base: treeUrls(project, parents.targetHead, dirs),
		pr: treeUrls(project, parents.changeHead, dirs),
	};

	return [...trees.base, ...trees.pr];
}


// Form tree urls
// We rely on the gitiles pluging to retrieve the trees
function treeUrls(project, commitID, dirs){
	let urls = [];
    	let endpoint = `${GET_URL}/plugins/gitiles/${project}/+/${commitID}`;
	for (dir of dirs){
		urls.push(`${endpoint}/${dir}`);
	}

	return urls;
}


// Form urls for all files need to be fetched 
function formBlobUrls (project, parents, 
		added_files, modified_files){
	
	// TODO: Integrate with getBlobs (./objectParser),
	// check if blob is already fetched

	// Fetch modified and added blobs
	//	- Modified: Take it for target, change and ca
	//	- Added: Take it only for change branch

	// If targetHead and caHead are not the same, fetch files for caHead
	let caRefs = []
	if  (parents.hasOwnProperty("caHead"))
		caRefs = blobUrls (project, parents.caHead,
			modified_files)
	let targetRefs = blobUrls (project, parents.targetHead,
			modified_files)
	let changeRefs = blobUrls (project, parents.changeHead, 
			[...added_files, ...modified_files])

	return [...targetRefs, ...changeRefs, ...caRefs]
}


// Form blobUrls for a remote ref
function blobUrls(project, head, files){

	let endpoint = `projects/${project}/commits`
	endpoint = `${HOST_ADDR}/${endpoint}/${head}/files/`

	let urls = [];
	for (f in files){
		//Trim the file path
		f = filePathTrim(files[f])
		urls.push(`${endpoint}/${f}/content`);
	}

	return urls
} 


function formRevisionUrls(change_id, revisions){

	let endpoint = `${HOST_ADDR}/changes/${change_id}/revisions`

	let urls = [];
	for (let i = 1; i < revisions+1; i++){
		urls.push(`${endpoint}/${i}/commit`);
	}

	return urls;
}


function formParentRevisions(objects){
	let parents = [];
	for (obj of objects){
		parents.push(obj.commit)
	}

	return parents;
}


// Extract the fpath and ref name of fetched trees
function treeParser({ item, info, data }){

	//TODO: Make sure if it's not "Not Found", then it is correct
	if (info =="Not Found") return;

	let key = extractAfter(item, "/+/");
	let ref = key.substr(41);
	key = key.substr(0,40);

	// Initialize sub-object, otherwise you'll get errors
	if(key in data == false){
		data[key] = {}; 
	}

	data [key][ref] = jsonifyResponse(info);
}

// Extract the fpath and ref name of fetched blob
function blobParser ({item, info, data}){

	let ref = extractBetween(item, "commits/", "/files")
	let key = extractBetween(item, "files/", "/content")
	key = filePathUnTrim(key);

	if(key in data == false){
		data[key] = {}; 
	}

	data [key][ref] = atob(info);
	return data;
}


// Extract the fpath and ref name of fetched blob
function revisionParser ({item, info, data}){

	let key = extractBetween(item, "revisions/", "/commit")

	data[key] = jsonifyResponse(info);
	return data;
}


//Form the the tree entries
function formTreeEntries(data){

	for (item in data)
		data[item] = data[item].entries

	console.log(data)

	/*for (let entry of entries) {
		// Convert the mode from decimal to octal
		entry.mode = FILEMODE[entry.mode];
		trees[entry.name] = entry;
	}

	return trees;*/
}
