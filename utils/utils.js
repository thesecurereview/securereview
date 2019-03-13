var RECEIVEPACK = 'git-receive-pack'
var UPLOADPACK = 'git-upload-pack'

//FIXME: Take user info automatically
// OR Add OAuth
//var authUsername= 'hmd'
var authUsername= 'admin'

var authEmail = 'hammad.afzali@gmail.com'
//var authPassword = "E2ugM4/7dXMEKev8ArN6i2VNmT/xVPgJwThW4ZGKoQ" //PC
//var authPassword = "WfE1/G0cueMqZq+4l4mwf7wuUnwp/7YgVxYuOTqmrw" //Laptop
var authPassword = "secret"

var HOST_ADDR = "http://localhost:8080"
var PUT_URL = "http://hmd@localhost:8080/a"

var auth = {
	username: authUsername,
	password: authPassword
}

var author = {
	name:authUsername, 
	email:authEmail
}


// Extract the parent path
function getParentPath(path){
	// Remove everything after the last "/"
	return path.substr(0, 
		path.lastIndexOf('/'));
}

// Remove the parent path
function removeParentPath(path){
	// Split by / and take the last one
	path = path.split("/");
	return path.pop();
}



// Get a list of intermediate paths in a filepath
function getIntermediatePaths (fpath){

	//remove the last dir from the end
	var list = [];
	while (fpath != ""){
		fpath = getParentPath (fpath);
		list.push (fpath);
	}

	return list;
}


// Find subdirs in an array of paths
function getCommonDirs (paths){

	/* FIXME: find a better solution
	* - find subdirs
	* - remove duplicates
	*/	

	//get all subdirs
	var dirs = [];
	for (var i = 0; i < paths.length; i++) {
		//get intermediate paths
		var iPaths = getIntermediatePaths(paths[i])
		// concat paths to the main list
		dirs = dirs.concat(iPaths);
	}

	/*FIXME: 
	* Make sure no parent is updated before its child
	* check if sort and uniq are engough
	*/

	// Remove duplicates
	// Sort by length (useful for the later comparison)
	return uniqArray(sortByLength(dirs));
}


// Replace all "/" occurrences with "%2F"
function filePathTrim (fpath){
	return replaceAll(fpath, '/', '%2F')
}

// Replace all "/" occurrences with "%2F"
function filePathUnTrim (fpath){
	return replaceAll(fpath, '%2F', '/')
}


// Replace all finds with the update
function replaceAll (str, find, update){
	return str.replace(new RegExp(find, 'g'), update)
}


// Extract everything between prefix and suffix
function extractBetween (str, prefix, suffix) {
	str = str.substring(str.indexOf(prefix) + prefix.length);
	return str.substring(0, str.indexOf(suffix));
}


// Compute the intersect between two arrays
function computeIntersect (a, b) {
	return a.filter(value => -1 !== b.indexOf(value));
}


// Remove duplicate elements from an array
function uniqArray(array) {
	return array.filter(function(element, index, self) {
    		return index == self.indexOf(element);
	});
}


// Get the dictionary values
function dictValues(dict){
	return Object.keys(dict).map(function(key){
	    return dict[key];
	});
}


// Check if obj has keys
function isEmpty(obj) {
 	return Object.keys(obj).length === 0;
}


// Pick keys from an object
function selectKeys(obj, keys) {
	let selected = {}
	for (i in keys){
		if (keys[i] in obj)
			selected[keys[i]]= obj[keys[i]]
	}
	
	return selected
}


// Costumize string sort by length then by dictionary order  
function sortByLength (arr){
	return	arr.sort(function(a, b) {
	  	return a.length - b.length || // sort by length, if equal then
		 a.localeCompare(b);    // sort by dictionary order
	});
}


// Sort a 2-dim-array by the 2nd column
function compareByColumn(a, b){
	if (a[3] === b[3]) {
		return 0;
	}
	else {
		return (a[3] < b[3]) ? -1 : 1;
	}
}


// Convert byteArray to hex string
function toHexString(byteArray) {
  return Array.prototype.map.call(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}


// Convert array of buffer to string
function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

