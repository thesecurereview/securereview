var RECEIVEPACK = 'git-receive-pack'
var UPLOADPACK = 'git-upload-pack'

//FIXME: Take user info automatically
// OR Add OAuth
var authUsername= 'hmd'
var authEmail = 'hammad.afzali@gmail.com'
var authPassword = "E2ugM4/7dXMEKev8ArN6i2VNmT/xVPgJwThW4ZGKoQ"
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


// Extract the dirpath from filepath
function getDirPaths(fpath){

	// Remove everything after the last "/"
	return fpath.substr(0, 
		fpath.lastIndexOf('/'));
}


// Get a list of intermediate paths in a filepath
function getIntermediatePaths (fpath){

	//remove the last dir from the end
	var list = [];
	while (fpath != ""){
		fpath = getDirPaths (fpath);
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

	//sort dirs and remove duplicates
	return uniqArray(dirs.sort());
}


function toHexString(byteArray) {
  return Array.prototype.map.call(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

