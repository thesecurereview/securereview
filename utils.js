var pushService = 'git-receive-pack'
var fetchService = 'git-upload-pack'
var service = 'git-upload-pack'

var authUsername= 'hmd'
var authEmail = 'hmdfsn@hotmail.com'
var authPassword = "FZ0dOkZo0+dPmOw9GQVj+/14GbN9x9CHpWeenFOEig"
//var authPassword = "zffQNE8Dgqqu6slT9afV+WLXEvCqKv/Obah2Mb1D0Q"
//var HOST_ADDR = "http://hmdfsn@localhost:8889"
HOST_ADDR = "http://amir.home:8080/"

var auth = {
	username: authUsername,
	password: authPassword
}

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


