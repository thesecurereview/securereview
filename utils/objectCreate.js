//Get new commit/blob/tree objects
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


// Get object hash
function getObjectHash(object_wrap){

	var hash = sha1.create();
	hash.update(object_wrap);

	return hash.hex();
}
