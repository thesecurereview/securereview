/**
* Get new commit/blob objects
* content = commit, blob, tree_entries
*/
function createGitObject(type, content){

	/*
	* Commit_Hash = SHA1("blob" + <size_of_file> + "\0" + <contents_of_file>)
	* obj=[mode, type, hash, name]
	* mode:
	- 100644: A normal file
	- 100755: An executable file
	- 120000: A symbolic link
	*/

	/*normalize the blob content*/
	if (type == "blob")
		content = normalize(content)

	//toObject
	let object;
	if (type == "tree") //content = tree_entries
		object = treeObject (content)
	else
		object = createBuffer (content, 'utf8')

	//wrap object into buffer
	let wrap = objectWrap (type, object)

	//compress&write file
	let compress = compressObject (wrap)

	//object hash
	let hash = getObjectHash (wrap)

	return {
		object: object,
		id: hash
	}	
}


/* create a new tree object*/
function createTreeObejct(tree_entries){

	/*
	* tree [content size]\0[Object Entries]
	* obj=[mode, type, hash, name]
	* [mode] [Object name]\0[SHA-1 of referencing blob or tree]
	* mode: 40000    
	*/

	/*/TODO: Make sure entries are sorted
	// Convert dict to array, sort it then recreate dict
	tree_entries = unwrap_tree_entries(tree_entries)	
	tree_entries = tree_entries.sort(compareByColumn);
	tree_entries = wrap_tree_entries(tree_entries)	
	*/	

	var type = "tree";
	var obj = createGitObject(type, tree_entries);
	
	objects.push([type, obj.object]);

	return obj.id;
}


/**
* Get object hash
*/
function getObjectHash(object_wrap){

	var hash = sha1.create();
	hash.update(object_wrap);

	return hash.hex();
}



/**
* Form the commit 
*/
function formCommit(treeHash, author, parents, message){

	/*let authorDateTime = new Date()
	let timestamp = Math.floor(authorDateTime.valueOf() / 1000)
	//get zone offset in minutes 
	let timezoneOffset = authorDateTime.getTimezoneOffset()*/

	let [timestamp, timezoneOffset] = determineTime()

	// initial commit
	if (!parents){ 
		parents = []
	}

	/* construct the commit*/
	let commit = {
		tree: treeHash,
		parent: parents,
		author: {
			name: author.name,
			email: author.email,
			timestamp: timestamp,
			timezoneOffset: timezoneOffset
		},
		message
	}

	return formCommitHeaders(commit) + '\n' + normalize(commit.message)
}



/**
* Form the commit header
*/
function formCommitHeaders (obj) {

	let headers = ''

	if (obj.tree) {
		headers += `tree ${obj.tree}\n`
	} else {// null tree
		headers += `tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\n` 
	}

	//Check if has parent (First commit has no parent)
	if (obj.parent && obj.parent.length) {
		//check if it has more than one parent
		for (let p of obj.parent) {
			headers += 'parent'
			headers += ' ' + p + '\n'
		}
	}

	let author = obj.author

	headers += `author ${author.name} <${author.email}> ${
		author.timestamp
		} ${formatTimezoneOffset(author.timezoneOffset)}\n`

	//No difference between committer and author of GUI commits
	let committer = obj.author

	headers += `committer ${committer.name} <${committer.email}> ${
		committer.timestamp
		} ${formatTimezoneOffset(committer.timezoneOffset)}\n`


	return headers
}


/**
* Form signed commit
*/
function formSignedCommit(commit, signature){

	let headers = comHeader(commit)
	let message = comMessage(commit)

	signature = normalize(signature)
	let signedCommit =
		headers + '\n' + 'gpgsig' + indent(signature) + '\n' + message
	
	return signedCommit
}


/**
* Extract the commit's signature
*/
function isolateSignature (commit) {
	
	//TODO: make sure it works in all cases
	// Take the last signature as the commit signature
	let signature = commit.slice(
		commit.lastIndexOf('-----BEGIN PGP SIGNATURE-----'),
		commit.lastIndexOf('-----END PGP SIGNATURE-----') +
		'-----END PGP SIGNATURE-----'.length
	)

	return outdent(signature)
}


// Create a sign commit object
function createSignedCommit(commitInfo, callback){

	// Form the commit 	
	var commit = formCommit(commitInfo.treeHash, commitInfo.author, 
		commitInfo.parents, commitInfo.commitMessage)

	// Sing the commit and then form signed commit
	signContent(authUsername, commit, function(result){

		// Take the commit signature
		// Since the commitMessage itself has signature
		// We take the last signature as the commit signature
		// This approach should work, but FIXME: make sure about it 
		var signature = isolateSignature (result);

		//Form signed commit
		callback (formSignedCommit(commit, signature));
	});
}

