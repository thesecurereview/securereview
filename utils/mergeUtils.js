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


// Merge all modified blobs
function merge_blobs(blobs, parents){
	var new_content, blobs, parent_dir, bottom_tree;

	let changeHead = parents.changeHead;
	let targetHead = parents.targetHead;
	let caHead = parents.hasOwnProperty("caHead") ? 
			parents.caHead : targetHead;

	let newBlobs = {}
	for (fpath in blobs){

		// Get different versions of a blob
		var blobs = blobs[fpath];

		// Merge blobs
		var new_content = merge_two_blobs (blobs[caHead],
			 blobs[targetHead], blobs[changeHead]);

		// Create a new blob object
		newBlobs[fpath] = createGitObject("blob", new_content);
	}

	return newBlobs;
}


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


//Update the bottom trees based on the change
function mergeBottomTree ({
	parents, 
	blobs, 
	added_files, 
	deleted_files, 
	modified_files,
	master_trees,
	pr_trees})
{
	let fpath, fname, parent;
	let newdirs = [];
	let objects = [];
	//TODO: update this code using updateBlobEntry in ./objectUtils
	// Delete blobs
	if (deleted_files.length > 0){
		for (var i in deleted_files) {
			// Find the parent tree in master
			fpath = deleted_files[i];
			parent = getParentPath(fpath);
			fname = removeParentPath(fpath);

			// Update master branch
			delete master_trees[parent][fname];
		}
	}

	// Add new blobs
	if (added_files.length > 0){
		for (var i in added_files) {
			// Find the parent tree in PR
			fpath = added_files[i];
			parent = getParentPath(fpath);
			fname = removeParentPath(fpath);

			// Check for new subdir
			if (master_trees[parent] !== undefined)
				master_trees[parent][fname] = pr_trees[parent][fname]
			else{
				let iPaths = getIntermediatePaths(parent);
				//bottom tree is dirs[0]
				while (master_trees[parent] === undefined){
					//keep track of new_dirs
					newdirs.push(parent);
					master_trees[parent] = pr_trees[parent];


					//Create new tree object to be pushed to the server
					let currentTree = getObjetValues(pr_trees[parent]);
					let type = "tree";
					let obj = createGitObject(type, currentTree);
					objects.push([type, obj.object]);

					//Remove bottom tree and go for the parent
					parent = iPaths.shift();
				}
			}

			// Create new blob objects to push to the server
			let type = "blob"
			let content = blobs[fpath][parents.changeHead]
			objects.push([type, createGitObject(type, content).object])
		}	 
	}

	// Merge blobs
	if (modified_files.length > 0){
		// Pick modified blobs
		blobs = selectKeys(blobs, modified_files)
		let blobs = merge_blobs(blobs, parents)

		for (var i in modified_files) {
			// Find the parent tree in master
			fpath = modified_files[i];
			parent = getParentPath(fpath);
			fname = removeParentPath(fpath);

			// Update master branch
			master_trees[parent][fname].oid = blobs[fpath].id 

			// Create new blob objects to push to the server
			objects.push(["blob", blobs[fpath].object])
		}
	}
//console.log(master_trees)
	//return {master_trees, newdirs, newObjects:objects};
}


// Propagate the update to the root tree
function propagateUpdate({ changed_dirs, master_trees }){

	// Reverse change dirs to start from bottom
	changed_dirs = changed_dirs.reverse()

	let objects = [];
	var treeHash, currentPath, currentTree, currentDir;

	// Loop over changed dirs, start with the bottom tree
	while  (changed_dirs.length > 0){

		// Get bottom path, dir, tree
		currentPath = changed_dirs[0];
		currentDir = removeParentPath(currentPath)
		currentTree = getObjetValues(master_trees[currentPath])

		// Sort the tree using entry paths
		currentTree.sort(comparePath)

		// Compute the new tree hash		
		var type = "tree";
		var obj = createGitObject(type, currentTree);
		objects.push([type, obj.object]);
		treeHash = obj.id

		// Update the parent tree with the new hash of current tree
		if (currentPath != ""){
			var parent_dir = changed_dirs[1];			
			master_trees[parent_dir][currentDir].oid = treeHash
		}

		// Remove the current dir and go for the upper level
		changed_dirs.shift();
	}

	return ({ treeHash, newTreeObjects:objects});
}


// Get tree contents
function getTrees({changed_dirs, parents, project}, callback){
	//TODO: sync both calls
	getTree (project, parents.targetHead, function(result){
		let mtrees = formTrees(result.tree) //formTrees(objects)

		getTree (project, parents.changeHead, function(result){
			let ptrees = formTrees(result.tree) //formTrees(objects)

			callback({ mtrees, ptrees })
		});
	});
}

