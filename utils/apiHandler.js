//Make a single api call
singleAPICall = function (endpoint, callback){

	var xhr = new XMLHttpRequest();
	xhr.onload = function(){
		callback(this.responseText, endpoint);
 	};

	xhr.open('get', endpoint, true);

	//Set Authorization
    	//xhr.setRequestHeader('Authorization', 'token ' + TOKEN);
    	xhr.setRequestHeader('Authorization', basicAuth(auth));

	xhr.send();
}


//Make multiple API calls 
multipleAPICall = function(urls, callbackMulti) {

	var data = {};
	for (var i=0; i<urls.length; i++) {
		var callback = function(responseText, apiURL) {

			data[apiURL] = responseText;

			//update the size of data
			var size = 0;
			for (var index in data) {
				if (data.hasOwnProperty(index))
					size ++;
			}

			if (size == urls.length){
				callbackMulti(data);
			}
		};

		singleAPICall(urls[i], callback);
	}
};

