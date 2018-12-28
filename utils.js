var pushService = 'git-receive-pack'
var service = 'git-upload-pack'
var authUsername= 'hmdfsn'
var authPassword = "YGA8OuKqH8/szn5CsH/s7nW+aAoWrJPgXCrDBDywVw"
//var authPassword = "zffQNE8Dgqqu6slT9afV+WLXEvCqKv/Obah2Mb1D0Q"
var HOST_ADDR = "http://hmdfsn@localhost:8889/"
var project = "test_api.git"
var url = HOST_ADDR + project

/*var authUsername= 'fsnfsn'
var authPassword = "erva9731"*/


/*Get the change number*/
function get_file_name(url){

	/* split by / and take the latest one*/
	url = url.split("/");
	return url.pop();
}


//find a dictionary key which contains a substring
function findValueByPrefix(object, prefix) {
	for (var property in object) {
		if (object.hasOwnProperty(property) && 
			property.toString().includes(prefix)) {
			return object[property];
		}
	}
}



