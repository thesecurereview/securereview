/**
* differentiate blobs: added, deleted, modified
*/
function differentiate_blobs (files){

	//ignore commit message: /COMMIT_MSG
	delete files["/COMMIT_MSG"]

	var added_files = [];
	var deleted_files = [];
	var modified_files = [];

	Object.keys(files).forEach(function(key) {
		
		//deleted blobs
		if (files[key].status == "D"){
			deleted_files.push (key);
		}

		//deleted blobs
		else if (files[key].status == "A"){
			added_files.push (key);
		}

		//renamed blobs
		else if (files[key].status == "R"){
			deleted_files.push (files[key].old_path); 
			added_files.push (key);
			/*IF size_delta == 0:
			* 	delete from master and add from change
			* ELSE 
			* 	take it a modified file
			*
			if (files[key].size_delta == 0){
				deleted_files.push (files[key].old_path); 
				added_files.push (key);
			}else{
				modified_files.push (key);
			}*/
	
		}

		//modified blobs
		else {
			modified_files.push (key);
		}
	});

	return [added_files, deleted_files, modified_files];
}


// Merge all modified blobs
function merge_blobs(blobContents, parents){

	var new_content, blobs, parent_dir, bottom_tree;

	let pr_head = parents.changeHead;
	let base_head = parents.baseHead;
	let ca_head = parents.hasOwnProperty("caHead") ? 
			parents.caHead : base_head;

	let newBlobs = {}
	for (fpath in blobContents){

		// Get different versions of a blob
		var blobs = blobContents[fpath];

		// Merge blobs
		var new_content = merge_two_blobs (blobs[ca_head],
			 blobs[base_head], blobs[pr_head]);

		// Create a new blob object
		newBlobs[fpath] = createGitObject("blob", new_content);
	}

	return newBlobs;
}


/**
* Merge two blobs
* base (taken from the ca)
* f1 (taken from target branch)
* f2 (taken from pr branch)
*/
function merge_two_blobs (base, f1, f2){

	/*
	* allocate the ArrayBuffer for each blob
	* uint16Array: two bytes for each char
	*/

	var ancestor = string_ArrayBuffer(base);
	var file1 = string_ArrayBuffer(f1);
	var file2 = string_ArrayBuffer(f2);

	var xmp = new Xmparam();
	xmp.level = XDL_MERGE_ZEALOUS_ALNUM;
	xmp.style = 0;
	xmp.favor = 0;
	xmp.xpp = 0;

	var result = {};

	var xdlmerge = xdl_merge(ancestor, file1, file2, xmp, result);

	return xdlmerge;
}


/*Blob contents are in the string format
* create a buffer*/
var string_ArrayBuffer = function(str) {
	return {
		ptr: Uint16Array.from(str, function(x, i) {
			return str.charCodeAt(i)}
		),

		size: Uint16Array.from(str, function(x, i) {
			return str.charCodeAt(i)}).length
	}
}


