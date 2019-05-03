/**
* Get new commit/blob/tree objects
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

	/*
	* tree [content size]\0[Object Entries]
	* obj=[mode, type, hash, name]
	* [mode] [Object name]\0[SHA-1 of referencing blob or tree]
	* mode: 40000    
	*/

	/*normalize the blob content*/
	if (type == "blob")
		content = normalize(content)

	//toObject
	let object;
	if (type == "tree"){
		object = treeObject (content)
	}else{
		object = createBuffer (content, 'utf8')
	}

	//wrap object into buffer
	let wrap = objectWrap (type, object)

	//compress&write file
	let compress = compressObject (wrap)

	return {
		id: getObjectHash (wrap), //object hash
		object: object
	}	
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
function formCommit (commit) {

	let headers = '';

	//First commit has no parent
	let parents;
	if (commit.parents)
		parents = commit.parents;
	else
		parents = [];

	if (commit.tree) {
		headers += `tree ${commit.tree}\n`
	} else {// null tree
		headers += `tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\n` 
	}

	//Check if commit has parent
	if (parents && parents.length) {
		for (let p of parents) {
			headers += 'parent'
			headers += ' ' + p + '\n'
		}
	}

	let author = commit.author
	headers += `author ${author.name} <${author.email}> ${
		author.timestamp
		} ${formatTimezoneOffset(author.timezoneOffset)}\n`

	//Check if committer is specified
	//They are the same in UI commits
	let committer = author;
	if (commit.commiter)
		committer = commit.commiter;

	headers += `committer ${committer.name} <${committer.email}> ${
		committer.timestamp
		} ${formatTimezoneOffset(committer.timezoneOffset)}\n`

	return headers + '\n' + normalize(commit.message)
}


// Create a sign commit object
function createSignedCommit(commitInfo, callback){
	let commit = formCommit(commitInfo);

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


