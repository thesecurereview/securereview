
/* create a new tree object*/
function createTreeObejct(tree_entries){

	/*
	* tree [content size]\0[Object Entries]
	* [mode] [Object name]\0[SHA-1 of referencing blob or tree]
	* obj=[mode, type, hash, name]
	* mode: 40000    
	*/

	/*extract fname from fpath
	FIXME It should be done at the first place*/
	for (let i = 0; i <tree_entries.length; i++) {

		let entry = tree_entries[i]
		//modify the fpath with fname
		let fileName = get_file_name(entry [3]);		
		entry [3] = fileName;

		tree_entries[i] = entry
	}

	/*Sort the tree before rehashing*/
	tree_entries = tree_entries.sort(compare_by_column);	

	/*FIXME remove the warp function and 
	make tree_entries compatible with treeObject
	*/
	tree_entries = wrap_tree_entries(tree_entries)

	var type = "tree";
	var obj = get_object(type, tree_entries);
	
	objects.push([type, obj.object]);

	return obj.id;
}


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
		object = createBuffer (content)

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


/**
* Get object hash
*/
function getObjectHash(object_wrap){

	var hash = sha1.create();
	hash.update(object_wrap);

	return hash.hex();
}



/**
* create the commit object
*/
function formCommit(tree_hash, author, parents, message){

	let authorDateTime = new Date()
	let timestamp = Math.floor(authorDateTime.valueOf() / 1000)
	//get zone offset in minutes 
	let timezoneOffset = authorDateTime.getTimezoneOffset()

	// initial commit
	if (!parents){ 
		parents = []
	}

	/* construct the commit*/
	let commit = {
		tree: tree_hash,
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
* create the commit header
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
* Create a review unit as follows
	<change_id>
	<review score>
	<reviewer’s comments>
	<reviewer's name> <reviewer's e-mail> <timestamp>
*/
function formReviewUnit (change_id, review){

	var timestamp, timezoneOffset;
	[timestamp, timezoneOffset] = determineTime()		

	let reviewUnit = ''
	reviewUnit += `changeId ${change_id}\n`
	reviewUnit += `score ${review.score}\n`
	// TODO: Disscus it to make sure if ok no to have comments
	//reviewUnit += `comments ${normalizeText(review.comments)}\n`
	reviewUnit += `reviewer ${authUsername} <${authEmail}> ${timestamp} ${
				formatTimezoneOffset(timezoneOffset)}\n`
	
	return reviewUnit
}



/**
* Embed the signed review in the commitMessage
*/
function embedReviewUnit(change_id, commitMessage, reviewUnit){

	// First replace the Change-Id with Signed Review
	// Then add the change id

	//TODO find a better approach
	var cidKey = "Change-Id:"
	var idx = commitMessage.lastIndexOf(cidKey);	
	var lasLine = commitMessage.substring(idx, idx+52);

	//remove the last two lines
	commitMessage = commitMessage.substring(0, idx-1);

	//Amend the commit message with reviewUnit and then add the change_id  
	return commitMessage + `${reviewUnit}\n${lasLine}\n`
}


/**
* Form a signed commit
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
* extract the commit's signature
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


/**
* Determine timestamp and offset zone
*/
function determineTime () {
	let authorDateTime = new Date()
	let timestamp = Math.floor(authorDateTime.valueOf() / 1000)
	//get zone offset in minutes 
	let timezoneOffset = authorDateTime.getTimezoneOffset()

	return [timestamp, timezoneOffset]
}


/**
* convert zone offset from minutes to hours
*/
function formatTimezoneOffset (minutes) {

	let sign = simpleSign(negateExceptForZero(minutes))
	minutes = Math.abs(minutes)
	let hours = Math.floor(minutes / 60)
	minutes -= hours * 60
	let strHours = String(hours)
	let strMinutes = String(minutes)
	if (strHours.length < 2) strHours = '0' + strHours
	if (strMinutes.length < 2) strMinutes = '0' + strMinutes

	return (sign === -1 ? '-' : '+') + strHours + strMinutes
}


/**
* create the signed commit
*/

/**
* normalize a string
*/
function normalize (str) {

	// remove all <CR>
	str = str.replace(/\r/g, '')
	// no extra newlines up front
	str = str.replace(/^\n+/, '')
	// and a single newline at the end
	str = str.replace(/\n+$/, '') + '\n'
	return str
}

function normalizeText (str) {

	// remove all <CR>
	str = str.replace(/\r/g, '')
	// no extra newlines up front
	str = str.replace(/^\n+/, '')
	// 
	str = str.replace(/\n+$/, '')
	return str
}



function indent (str) {
	return (
		str.trim()
		.split('\n')
		.map(x => ' ' + x)
		.join('\n') + '\n'
	)
}


function outdent (str) {
	return str.split('\n')
	.map(x => x.replace(/^ /, ''))
	.join('\n')
}


function negateExceptForZero (n) {
 	return n === 0 ? n : -n
}


function simpleSign (n) {
	return Math.sign(n) || (Object.is(n, -0) ? -1 : 1)
}


function comMessage (commit) {
	return normalize(commit.slice(commit.indexOf('\n\n') + 2))
}


function comHeader (commit) {
	return commit.slice(0, commit.indexOf('\n\n'))
}



/*concatinate two arrays and remove duplicates */
function array_concat(a, b){

	return a.concat(b.filter(function (item) {
	    return a.indexOf(item) < 0;
	}));
}

/*remove duplicate elements*/
function uniq(array) {
	return array.filter(function(element, index, self) {
    		return index == self.indexOf(element);
	});
}


/*Extract the fpath and ref name of the blob*/
function blob_info (item){

	return [item.match(/files\/(.*?)\/raw/i)[1],
		item.substring(item.indexOf('ref=') + 4)];
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

/*convert hex to bytes*/ 
function hex_to_bytes(hex) {
	var bytes = []
	for (i = 0; i < hex.length; i+=2) {
		var ch = parseInt(hex.substr(i, 2), 16);
		bytes.push(ch); 
	}
	res = new Uint8Array(bytes);
	return res.buffer;
}

/*
 * it does so by iterating over the entries and adding up the mode length
 * and the length of the filename (+20 chars for sha1). The reason as to why
 * we can't use just.length is in the FIXME below.
 */

/*Helper method to compute the tree length */
var compute_tree_length = function(entries) {
	var result = 0;
	for (var i = 0; i < entries.length; i++)
		result += (entries[i][0].toString(8) + 
			" " + entries[i][3] + "\0").length + 20;

	return result;
}


/*sort a 2-dim-array by the 2nd column*/
function compare_by_column(a, b){
	if (a[3] === b[3]) {
		return 0;
	}
	else {
		return (a[3] < b[3]) ? -1 : 1;
	}
}


/*Encoding*/
function encode_utf8(s) {
	return unescape(encodeURIComponent(s));
}

function decode_utf8(s) {
	return decodeURIComponent(escape(s));
}


/*Convert array of tree entries to array of dictionary*/
function wrap_tree_entries (entries){

	var keys = ["mode", "type", "id", "path"];
	var result = [];

	for (let entry of entries) {

		var tmp = {}
		for (let i = 0; i<keys.length; i++) {
			tmp[keys[i]] = entry[i];
		}
		result.push(tmp)
	}

	return result;
}


/*parse the tree content*/
function unwrap_tree_entries (entries){
	
	/*
	* current format: obj = {id:"", mode:"", name:"", path:"", type:""}
	* desired format: array = [mode, type, id, name]
	*/

	var unwrap_tree = []; 
	for (i in entries){

		var entry = [];
		var mode = entries[i].mode;

		/*omit the first char of the tree mode*/
		if  (entries[i].type == 'tree'){
			mode = mode.substr(1);
		}

		/*create the tree entry*/
		entry.push(mode);
		entry.push(entries[i].type);
		entry.push(entries[i].id);
		entry.push(entries[i].path);
		unwrap_tree.push(entry);
	}

	return unwrap_tree;
}



/*parse the tree content*/
function merge_unwrap_tree_entries (entries){
	
	/*
	* current format: obj = {id:"", mode:"", name:"", path:"", type:""}
	* desired format: array = [mode, type, id, name]
	*/

	var unwrap_tree = []; 
	for (i in entries){

		var entry = [];
		var mode = entries[i].mode;

		/*omit the first char of the tree mode*/
		if  (entries[i].type == 'tree'){
			mode = mode.substr(1);
		}

		/*create the tree entry*/
		entry.push(mode);
		entry.push(entries[i].type);
		entry.push(entries[i].id);
		entry.push(entries[i].name);
		unwrap_tree.push(entry);
	}

	return unwrap_tree;
}


/*sort an array of objects based name*/
function sortFactory (prop) {
	// https://stackoverflow.com/a/40355107/2168416
	return function(a,b){
		+(a[prop] > b[prop]) || -(a[prop] < b[prop])		
	}
}


//console.log(data.sort(sortFactory("name")))
//console.log(sort_array_objects(data, "name"))


