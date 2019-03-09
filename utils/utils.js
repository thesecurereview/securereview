var RECEIVEPACK = 'git-receive-pack'
var UPLOADPACK = 'git-upload-pack'

//FIXME: Take user info automatically
// OR Add OAuth
var authUsername= 'hmd'
var authEmail = 'hammad.afzali@gmail.com'
var authPassword = "E2ugM4/7dXMEKev8ArN6i2VNmT/xVPgJwThW4ZGKoQ"
authPassword = "WfE1/G0cueMqZq+4l4mwf7wuUnwp/7YgVxYuOTqmrw"
var HOST_ADDR = "http://localhost:8080"
var PUT_URL = "http://hmd@localhost:8080/a"

var auth = {
	username: authUsername,
	password: authPassword
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


/**
* Find subdirs in an array of paths
*/
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


function toHexString(byteArray) {
  return Array.prototype.map.call(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
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
};


// costumize string sort by length then by dictionary order  
function sortByLength (arr){
	return	arr.sort(function(a, b) {
	  	return a.length - b.length || // sort by length, if equal then
		 a.localeCompare(b);    // sort by dictionary order
	});
}
