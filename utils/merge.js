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


/**
* Run the merge process 
*/
function runMergeProcess(change_id, project, heads){

	// Get the status of changed files in the change branch
	getRevisionFiles(change_id, heads.changeHead, function(result){

		//differentiate files between change and base branches
		var [added_files, deleted_files, modified_files] = 
			differentiate_blobs(result);

		// Find involved trees/subtrees in the merge
		var paths = added_files.concat(
			deleted_files, modified_files);

		// Creat a uniq list of involved trees
		var changed_dirs = getCommonDirs (paths);


		// Get modified blobs for ca, base, pr
		getBlobs(project, heads, modified_files, 
			function(result){
				console.log(result)
			}
		);

		//TODO: get the CA tree hash = parent of the first commit
	});

}

