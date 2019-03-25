//Get tree entry mode
function mode2type (mode) {
	switch (mode) {
		//case '040000': return 'tree'
		case '40000': return 'tree'
		case '100644': return 'blob'
		case '100755': return 'blob'
		case '120000': return 'blob'
		case '160000': return 'commit'
	}
	throw new Error ( `Unexpected GitTree entry mode: ${mode}`)
}


// Parse Tree Object
function parseTreeObject (buffer) {
	let entries = {}
	let cursor = 0

	//TODO: find a better solution to keep track of trees

	while (cursor < buffer.length) {

		let space = buffer.indexOf(32, cursor)
		if (space === -1) {
			throw new Error (
				`GitTree: Error parsing buffer at byte location ${cursor}: 
				Could not find the next space character.`
			)
		}

		let nullchar = buffer.indexOf(0, cursor)
		if (nullchar === -1) {
			throw new Error (
				`GitTree: Error parsing buffer at byte location ${cursor}: 
				Could not find the next null character.`
			)
		}

		let mode = buffer.slice(cursor, space).toString('utf8')
		//omit the first char of the tree mode
		if (mode === '040000') mode = '40000'

		//Entry type
		let type = mode2type(mode)

		//Entry path
		let path = buffer.slice(space + 1, nullchar).toString('utf8')

		//Entry oid
		let oid = buffer.slice(nullchar + 1, nullchar + 21).toString('hex')

		// Keep track of path
		entries[path] = { mode, path, oid, type }
		
		//read next entry
		cursor = nullchar + 21
	}

	return entries
}


// Unwrap a Git Object buffer
function objectReader(type, buffer){

	/*/ FIXME: Check the if unwrap is correct
	let unwrap = buffer.slice(s + 1, i) // get object content
	let unwrap = buffer.slice(0, i) // get object content
	let s = buffer.indexOf(32) // first space
	let i = buffer.indexOf(0) // first null value
	// TODO: verify buffer length
	let actualLength = buffer.length - (i + 1)*/
	
	if (type == "tree")
		return parseTreeObject (buffer)
	else
		return buffer.toString('utf8')

	
}


// Parse a commit object
function parseCommitObject(object){

	var treeHash = object.slice(
		object.indexOf('tree ') + 5, 
		object.indexOf('\nparent')
	)	

	//TODO: extract other fields
	return {
		tree: treeHash
	}
}


// Parse an array of Git objects to extract trees
function formTrees(objects, treeHash, dirs){

	let trees = {}
	let unfetched = {}

	// Changed dirs are sorted by length, in a dictionary order
	// Thus, going through changed dirs, 
	// we make sure that parent directories are visited first
	// To do so, we take a counter and traverse the dirs
	let counter = 0
	while (dirs.length > counter){
		dirPath = dirs[counter]

		//update treeHash for non-root trees
		if (counter > 0){
			let parent = getParentPath (dirPath)
			let dir = removeParentPath (dirPath)
			treeHash = trees[parent][dir].oid	
		}

		// As soon as an unfetched tree is found, break the loop
		// as it is not possible to extract the subtrees
		try{
			trees [dirPath] = objects[treeHash].content
		}
		catch(err) {
			unfetched = {
				oid: treeHash,
				dirs: dirs.slice(counter)
			};
			break
		}
		
		counter++;
	}
 
	return { 
		trees: trees, 
		unfetched: unfetched
	}
}


// Parse fetched Git objects to extract trees
function getTrees(objects, parents, changed_dirs){

	/*/ TODO: Check if the object type is commit, 
	// otherwise raise an error 
	let targetCommit = objects[parents.targetHead].type === "commit" ? 
			objects[parents.targetHead].content : 
			throw new Error('Head commit for the target branch is not fetched')
	let changeCommit = objects[parents.changeHead].type === "commit" ?
			objects[parents.changeHead].content : 
			throw new Error('Head commit for the change branch is not fetched')
	*/

	//Get the tree hash in both branches
	let targetCommit = objects[parents.targetHead].content;
	let changeCommit = objects[parents.changeHead].content;
	let targetTreeHash = parseCommitObject(targetCommit).tree
	let changeTreeHash = parseCommitObject(changeCommit).tree

	// Get trees/subtrees in the target/master and changes branches
	let targetTrees = formTrees(objects, targetTreeHash, changed_dirs)
	let changeTrees = formTrees(objects, changeTreeHash, changed_dirs)

	//
	let unfetched_trees = Object.assign({}, 
		targetTrees.unfetched, changeTrees.unfetched);

	return [targetTrees.trees, changeTrees.trees, unfetched_trees]
}


// Parse fetched Git objects to extract blobs
function getBlobs(objects, trees, paths){
	
	var blobs = {}
	for (var i in paths){
		fpath = paths[i];
		parent = getParentPath(fpath);
		fname = removeParentPath(fpath)
		try{
			blobs[fpath] = objects[trees[fpath].oid]
		}
		catch{
			blobs[fpath] = null
		}
			
	}
	
	return blobs
}

