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


// Parse an array of Git objects to extract blob and trees
function getTrees(objects, parents, changed_dirs){

	// Get base, change and ca commits
	/*/ TODO: Check if the object type is commit, otherwise raise an error 
	let baseCommit = objects[parents.baseHead].type === "commit" ? 
			objects[parents.baseHead].content : throw new Error('Head commit for the base branch is not fetched')
	let changeCommit = objects[parents.changeHead].type === "commit" ?
			objects[parents.changeHead].content : throw new Error('Head commit for the change branch is not fetched')
	*/

	let baseCommit = objects[parents.baseHead].content;
	let changeCommit = objects[parents.changeHead].content;

	// Get trees/subtrees in the base/master branch
	let baseTreeHash = parseCommitObject(baseCommit).tree
	let baseTrees =  objectPraser(objects, baseTreeHash, changed_dirs)

	// Get trees/subtrees in the change branch
	let changeTreeHash = parseCommitObject(changeCommit).tree
	let changeTrees =  objectPraser(objects, changeTreeHash, changed_dirs)

	return [baseTrees, changeTrees]
}



/**
* Run the merge process 
*/
var runMergeProcess = async function (change_id, project, parents){

	let repo_url = HOST_ADDR + "/" + project
	var heads = dictValues(parents)

	fetchObjects( {repo_url, heads}, ({ objects }) => {
		
		// Get the status of changed files in the change branch
		getRevisionFiles(change_id, parents.changeHead, function(result){

			//differentiate files between change and base branches
			var [added_files, deleted_files, modified_files] = 
				differentiate_blobs(result);

			// Find involved trees/subtrees in the merge
			var paths = added_files.concat(
				deleted_files, modified_files);

			// Creat a uniq list of involved trees
			var changed_dirs = getCommonDirs (paths);

			// Go through already retrieved objects
			// TODO: Make sure all needed treea are fetched 
			var [baseTrees, changeTrees] = 
				getTrees(objects, parents, changed_dirs)		

			// Get modified blobs for ca, base, pr
			// TODO: Check if blobs are already fetched, if so get them in the previous step
			getBlobs(project, parents, modified_files, 
				function(result){
					console.log(result)
				}
			);
		});
	});

}

