/*/TODO: Take configs from user
const SERVER_GH = "github.com";
const SERVER_GL = "gitlab.com";
const HOST_GH = `https://${SERVER_GH}`;
const HOST_GL = `https://${SERVER_GL}`;
const API_GH = `https://api.${SERVER_GH}`;
const API_GL = `https://api.${SERVER_GL}`;
const RPACK = 'git-receive-pack'
const UPACK = 'git-upload-pack'
*/


var RECEIVEPACK = 'git-receive-pack'
var UPLOADPACK = 'git-upload-pack'
var authUsername= 'admin'
var authPassword = "secret" 
var authEmail = 'hammad.afzali@gmail.com'
//var authPassword = "UfkRENHIoRquwpgbvftB+9R0knqV3+C3iYQUyw/Vbw" //hmd
//var authPassword = "WfE1/G0cueMqZq+4l4mwf7wuUnwp/7YgVxYuOTqmrw" //Laptop
//var authPassword = "mAwEx0wcFOYz4yIzA9agMC8mRmIVWvV+HTAyvA66pQ" //"secret"

//var HOST_ADDR = "http://ec2-3-209-56-164.compute-1.amazonaws.com/gerrit/"
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


// Sort an array using the path key
function comparePath (a, b) {
  // https://stackoverflow.com/a/40355107/2168416
  return compareStrings(a.path, b.path)
}


function compareStrings (a, b) {
  // https://stackoverflow.com/a/40355107/2168416
  return -(a < b) || +(a > b)
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
	return arrayUniq(sortByLength(dirs));
}


// Replace all finds with the update
function replaceAll (str, find, update){
	return str.replace(new RegExp(find, 'g'), update)
}


// Replace all "/" occurrences with "%2F"
function filePathTrim (fpath){
	return replaceAll(fpath, '/', '%2F')
}


// Replace all "/" occurrences with "%2F"
function filePathUnTrim (fpath){
	return replaceAll(fpath, '%2F', '/')
}


// Extract everything between prefix and suffix
function extractBetween (str, prefix, suffix) {
	str = str.substring(str.indexOf(prefix) + prefix.length);
	return str.substring(0, str.indexOf(suffix));
}


// Compute the difference between two arrays
function arrayDifference (arr1, arr2) {
	return arr1.filter(x => !arr2.includes(x));
}


// Compute the intersect between two arrays
function arrayIntersect (a, b) {
	return a.filter(value => -1 !== b.indexOf(value));
}


// Remove duplicate elements from an array
function arrayUniq(array) {
	return array.filter(function(element, index, self) {
    		return index == self.indexOf(element);
	});
}


// Check if obj has keys
function isEmpty(obj) {
 	return Object.keys(obj).length === 0;
}


// Check if an object is empty
function isEmpty(obj) {
  	return Object.keys(obj).length === 0;
}


// Get values from a dictionary
function getObjetValues(dict){
	return Object.keys(dict).map(function(key){
	    return dict[key];
	});
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


// Parse the change URL
function getChangeNumber(changeUrl){

	//check if url ends with "/", remove it
	if (changeUrl.endsWith('/')) changeUrl = changeUrl.slice(0,-1)
	
	/*
	* TODO: Find a reliable approach
	* From  <class="style-scope gr-change-view">
	*/
	return changeUrl.split("+/")[1].split("/")[0]
}


/* create a buffer*/
var string_ArrayBuffer = function(str) {
	return {
		ptr: Uint16Array.from(str, function(x, i) {
			return str.charCodeAt(i)}
		),

		size: Uint16Array.from(str, function(x, i) {
			return str.charCodeAt(i)}).length
	}
}


// Extract the fpath and ref name of fetched blob
function blobParser (item, info, data){

	let ref = extractBetween(item, "commits/", "/files")
	let key = extractBetween(item, "files/", "/content")
	key = filePathUnTrim(key);

	if(key in data == false){
		data[key] = {}; 
	}

	data [key][ref] = atob(info);
	return data;
}


// Extract the fpath and ref name of fetched blob
function revisionParser (item, info, data){

	let key = extractBetween(item, "revisions/", "/commit")

	data[key] = jsonifyResponse(info);
	return data;
}




// Costum funciton to parse change info
function jsonifyResponse (data){

	//split it into lines
	data = data.split("\n")

	//remove the first and last line
	data.shift()
	data.pop()

	//join array of lines
	data = data.join("\n")
	data = JSON.parse(data);
	
	return data
}


