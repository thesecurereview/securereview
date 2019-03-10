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
	
	let unwrap
	if (type == "tree")
		return parseTreeObject (buffer)
	else
		return buffer.toString('utf8')

	
}


// Parse an array of Git objects to extract trees
function formTrees(objects, rootTreeHash, dirs){

	// Get the tree corresponding to the root directory 
	// and remove it from dirs
	let trees = {
		"":objects[rootTreeHash].content
	}

	// Changed dirs are sorted by length, in a dictionary order
	// Thus, going through changed dirs, 
	// we can make sure that parent directories are visited first
	// To do so, we take a counter and traverse the dirs
	let counter = 1
	while (dirs.length > counter){
		let dirPath = dirs[counter]
		let parent = getParentPath (dirPath)
		let dir = removeParentPath (dirPath)	
		try{
			let treeHash = trees[parent][dir].oid
			trees [dirPath] = objects[treeHash].content
		}
		catch(err) {
			console.log(err)
		}
		
		counter++;
	}

	return trees
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


// Parse an array of Git objects to extract blob and trees
function getTrees(objects, parents, changed_dirs){

	/*/ TODO: Check if the object type is commit, 
	// otherwise raise an error 
	let baseCommit = objects[parents.baseHead].type === "commit" ? 
			objects[parents.baseHead].content : 
			throw new Error('Head commit for the base branch is not fetched')
	let changeCommit = objects[parents.changeHead].type === "commit" ?
			objects[parents.changeHead].content : 
			throw new Error('Head commit for the change branch is not fetched')
	*/

	let baseCommit = objects[parents.baseHead].content;
	let changeCommit = objects[parents.changeHead].content;

	// Get trees/subtrees in the base/master branch
	let baseTreeHash = parseCommitObject(baseCommit).tree
	let baseTrees =  formTrees(objects, baseTreeHash, changed_dirs)

	// Get trees/subtrees in the change branch
	let changeTreeHash = parseCommitObject(changeCommit).tree
	let changeTrees =  formTrees(objects, changeTreeHash, changed_dirs)

	return [baseTrees, changeTrees]
}

