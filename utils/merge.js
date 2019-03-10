var master_trees, pr_trees
var objects = []

/**
* Propagate the update to the root tree
*/
function updateRootTree({ changed_dirs, objects }){

	var new_tree_hash, currentPath, currentTree, currentDir;

	// reverse change dirs to start from bottom
	changed_dirs = changed_dirs.reverse()

	// loop over changed dirs, start with the bottom tree
	while  (changed_dirs.length > 0){

		// bottom level is always at index 0
		currentPath = changed_dirs[0];
		currentTree = dictValues(master_trees[currentPath])
		currentDir = removeParentPath(currentPath)

		// compute the new tree hash		
		// TODO: Make sure entrty path is not a full path
		// createTreeObejct(tree_entries)
		var type = "tree";
		var obj = createGitObject(type, currentTree);
		objects.push([type, obj.object]);
		new_tree_hash = obj.id	

		// update the parent with the new hash of current tree (except the root level)
		if (currentPath != ""){

			var parent_dir = changed_dirs[1];			
			var parent_tree;

			// Check for new subdir
			// FIXME check if it always works
			// TODO: Add entry from PR instead of creating one in master
			let entry, object;
			while (master_trees[parent_dir] === undefined){
				let { entry, object } = add_new_subdir (currentTree);
				objects.push([type, obj.object]);
				parent_dir = entry.path
				parent_tree = entry
			}

			// Update master branch			
			master_trees[parent_dir][currentDir].oid = new_tree_hash
		}

		//remove the current dir and go for the upper level
		changed_dirs.shift();
	}

	return new_tree_hash;
}


/**
* Update the bottom trees based on the change
*/
function mergeBottomTrees (project, changed_dirs, parents, 
		added_files, deleted_files, modified_files, callback){

	var fpath, fname, parent, bottom_tree;

	//TODO: update this code using updateBlobEntry in ./objectUtils
	//add new blobs
	if (added_files.length > 0){
		for (var i in added_files) {
			// Find the parent tree in PR
			fpath = added_files[i];
			parent = getParentPath(fpath);
			fname = removeParentPath(fpath)

			// Update master branch
			master_trees[parent][fname] = pr_trees[parent][fname]; 
		}
		 
	}

	//delete blobs
	if (deleted_files.length > 0){
		for (var i in deleted_files) {
			// Find the parent tree in master
			fpath = deleted_files[i];
			parent = getParentPath(fpath);
			fname = removeParentPath(fpath)

			// Update master branch
			delete master_trees[parent][fname];
		}
	}

	//merge blobs
	if (modified_files.length > 0){
		// Get modified blobs for ca, base, pr
		// TODO: Check if blobs are already fetched, 
		//if so get them in the previous step
		var heads = dictValues(parents)
		getBlobs(project, heads, modified_files, 
			function(blobContents){
				let updates = merge_blobs(blobContents, parents)
				console.log(updates)
				for (var i in modified_files) {
					// Find the parent tree in master
					fpath = modified_files[i];
					parent = getParentPath(fpath);
					fname = removeParentPath(fpath)

					// Update master branch
					/*var bottom_tree = master_trees[parent][fname] 
					bottom_tree.oid = updates[fpath].id
					master_trees[parent][fname] = bottom_tree*/
					master_trees[parent][fname].oid = updates[fpath].id 

					// Save new objects for later
					objects.push(["blob", updates[fpath].object])
				}
				// New objects are passed to updateRootTree
				callback(updateRootTree({ changed_dirs, objects }));
			}
		);
	} 
	else {
		// In case there is no modified blobs
		// No new objects are created yet
		// Go to update trees for deleted/added blobs
		callback(updateRootTree({ changed_dirs }));
	}

}


/**
* Run the merge process 
*/
var runMergeProcess = async function (change_id, project, parents, callback){

	let repo_url = HOST_ADDR + "/" + project
	var heads = dictValues(parents)

	fetchObjects( {repo_url, heads}, ({ data }) => {
		console.log(data)

		let changeHead = parents.changeHead
		// Get the status of changed files in the change branch
		getRevisionFiles(change_id, changeHead, function(result){

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
			[master_trees, pr_trees] = 
				getTrees(data, parents, changed_dirs)

			//TODO find a better way to save change branch head
			let changeCommit = data[changeHead].content
			var type = "commit";
			var obj = createGitObject(type, changeCommit);
			objects.push([type, obj.object]);	

			//Merge botton trees, propagate updates to get new root tree hash
			mergeBottomTrees (project, changed_dirs, parents,
				added_files, deleted_files, modified_files,
				function(treeHash){
					// return new tree hash and new objects
					callback(treeHash, objects)
				}
			);
		});
	});

}

