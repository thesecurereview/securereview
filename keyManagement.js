'use strict';

/**
* Customize Mailvelop functions to work with PGP keys
* SRC = "mailvelope/src"
* SRC/app/keyring/[keyRing.js, importKeys.js, GenerateKey.js]
* SRC/chrome/lib/lib-mvelo.js
* SRC/modules/[keyring.js, keyringStore.js]
https://ageyev.github.io/crypto/openpgp/
https://github.com/mailvelope/mailvelope
*/

var privkey;

/**
 * Convert MM/DD/YYYY string to date
 * @param  {Date_str} MM/DD/YYYY format	  
 * @return {Date} unix GMT 
 */
function to_date(date_str) {
	var parts = date_str.split("/");
	return new Date(parts[2], parts[1] - 1, parts[0]);
}


/**
* Get difference between 2 dates
 * @param  {Date} MM/DD/YYYY format	  
 * @return {Number} days after the creation date until when the key expires
*/
var get_diff_dates = function (ex_date){
	/*form two dates*/
	var today = new Date();
	ex_date = new Date(ex_date);

	/*diff in sec*/
	var diffDays = Math.abs(ex_date.getTime() - today);
	/*diff in days*/
	return Math.ceil(diffDays / (1000 * 3600 * 24));
}


/**
 * Form the key expiration date
 * @param  {Date} MM/DD/YYYY format	  
 * @return {Number} seconds after the creation date until when the key expires
 */
var get_diff_seconds = function(ex_date){
	var today = new Date();
	today.setHours(0,0,0,0);

	ex_date = to_date(ex_date); 
	return (ex_date - today)/1000;
}


/**
 * Get user and email from user_id.
 * @param  {String} user_id	  
 * @return {strings} user and email
 */
var extract_user_email = function(user_id) {
	var user_name = user_id.substr(0, user_id.lastIndexOf("<")-1);
	var email = user_id.substr(user_id.indexOf("<")+1).slice(0, -1);;
  
	return [user_name, email];
}


/**
 * Validate an email address.
 * @param  {String} address	  
 * @return {Boolean} True if valid
 */
var validate_email = function(address) {
	var pattern = 
		/^[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;

	return pattern.test(address);
}


/**
 * Get the pgp key algorithm
 * @param  {openpgp.Key} keyType
 * @return {String} key algorithm
 */
function get_key_algorithm(keyType) {
  	var result = '';
 	switch (keyType) {
	  	case 'rsa_encrypt_sign':
			result = "RSA (Encrypt or Sign)";
			break;
	  	case 'rsa_encrypt':
			result = "RSA Encrypt-Only";
			break;
	  	case 'rsa_sign':
			result = "RSA Sign-Only";
			break;
	  	case 'elgamal':
			result = "Elgamal (Encrypt-Only)";
			break;
	  	case 'dsa':
			result = "DSA (Digital Signature Algorithm)";
			break;
	  	default:
			result = "UNKNOWN";
  	}
  	return result;
}


/**
 * Get primary or first available user id of key
 * @param  {openpgp.Key} key
 * @param  {Boolean} [validity_check=true] - only return valid user ids
 * @return {String} user id
 */
function get_user_id(key, validity_check) {

	validity_check = typeof validity_check === 'undefined' ? true : false;
	var primaryUser = key.getPrimaryUser();

	if (primaryUser) {
		return primaryUser.user.userId.userid;
	} else {
		/*there is no valid user id on this key*/
		if (!validity_check) {
			/*take first available user ID*/
			for (var i = 0; i < key.users.length; i++) {
				if (key.users[i].userId) {
			  		return key.users[i].userId.userid;
				}
			}
		}

		return 'keygrid_invalid_userid';
	}
}


/**
 * Get basic info about the pgp key
 * @param  {openpgp.Key} keys
 * @return {Array of string} key info
 */
function extract_keys_info (keys){

	/*extract info of several keys*/
	var result = [];
	keys.forEach(function(key) {
		/*algorithm, creation_date, expiration_date
		email, fingerprint*/
		var keys_info = {};

		if (key.isPublic()) {
			keys_info.type = 'public';
		} else {
			keys_info.type = 'private';
		}

		keys_info.key_id = key.primaryKey.getKeyId().toHex().toUpperCase();
		keys_info.fingerprint = key.primaryKey.getFingerprint().toUpperCase();

		try {
			/*user_id : "user_name <email>"*/
			keys_info.user_id = get_user_id(key, false);
			var user_info = extract_user_email(keys_info.user_id);
			keys_info.user_name = user_info[0];
			keys_info.email = user_info[1];

			keys_info.expiration_date = key.getExpirationTime();
			if (keys_info.expiration_date) {
				keys_info.expiration_date = keys_info.expiration_date.toISOString();
			} else {
				keys_info.expiration_date = false;
			}

		} catch (e) {
			keys_info.user_name = keys_info.user_name || 'NO USERID FOUND';
			keys_info.email = keys_info.email || 'UNKNOWN';
			keys_info.expiration_date = keys_info.expiration_date || 'UNKNOWN';
		}

		keys_info.creation_date = key.primaryKey.created.toISOString();
		keys_info.key_size = key.primaryKey.getBitSize();
		keys_info.algorithm = get_key_algorithm(key.primaryKey.algorithm);

	    	result.push(keys_info);
  	});

	return result;

}


/**
 * Read the key and Check the validity_check
 * @param  {openpgp.Key} armored format
 * @return {Array of string} key info
 */
function read_keys(armored) {

	var parsedKey = openpgp.key.readArmored(armored);
	var err = parsedKey.err
	if (err) {
		window.alert("Imported key is not valid!");
		//close();
		//return err;
	}
	else{
		return parsedKey;
	}
}


/**
 * Read the Import key as text in armored format
 * @return {Array of string} key info
 */
function import_key (){

	privkey = document.getElementById("newKey").value;
	var parsedKey = read_keys (privkey);

	/*extract key info*/
	parsedKey = extract_keys_info(parsedKey.keys);

	/*store user key if they have not created one already*/
	store_key (parsedKey, privkey);
}


/**
 * Read the uploaded key as text in armored format
 * @return {Array of string} key info
 */
function upload_key (){

	var inputElement = document.getElementById("uploaded_files");
	inputElement.addEventListener("change", handleFiles, false);

	function handleFiles() {
		var fileList = this.files; 
		var numFiles = fileList.length;

		/*List key files properties.
		var output = [];
		for (var i = 0, f; f = files[i]; i++) {
			output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
				  f.size, ' bytes, last modified: ',
				  f.lastModifiedDate ? f.lastModifiedDate.toLocaledate_string() : 'n/a',
				  '</li>');
		}
		document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
		*/

		var reader = new FileReader();
		/*FIXME read multiple key files*/
		reader.readAsText(fileList[0]);
		reader.onloadend = function(){
			privkey = reader.result;
			var parsedKey = read_keys (privkey);

			/*extract key info*/
			parsedKey = extract_keys_info(parsedKey.keys);

			/*store user key if they have not created one already*/
			store_key (parsedKey, privkey);
	    	}
	}
}


/**
 * Generate key pairs
 * @return {String} privkey, pubkey
 */
function generate_key (){

	var email = document.getElementById("email_id").value;
	/*check if the email is valid*/
	const valid_email = validate_email(email);
	if (!valid_email) {
		window.alert("Email is not valid!");
		return 'invalid_email';
	}

	var user_name = document.getElementById("name_id").value;

	/*FIXME: For the porpuse of the user_study we assume set a couple of parameters*/
	var keyExpiration = 0
	var key_size = 2048
	var passphrase = "";
	/*var keyExpiration = document.getElementById("key_expiration_date").value;
	if (!keyExpiration) {
		keyExpiration = 0
	}
	else{
		keyExpiration = get_diff_seconds(keyExpiration);
	}

	var passphrase = document.getElementById("password_id").value;
	var key_size = document.getElementById("key_size").value;
	*/

	var options = {
		userIds: [{ name: user_name, 
			email: email }], 
		/*RSA key size*/
		numBits: key_size, 	
		/*protect the private key*/	
		passphrase: passphrase,
		keyExpirationTime: keyExpiration     
	};

	/*generate the key*/
	openpgp.generateKey(options).then(function(key) {
		var privkey = key.privateKeyArmored; 
		var pubkey = key.publicKeyArmored;   

		var parsedKey = read_keys (privkey);

		/*extract key info*/
		parsedKey = extract_keys_info(parsedKey.keys);

		/*store user key if they have not created one already*/
		store_key (parsedKey, privkey);
	});

}


/*########################################################*/
/**
 * Store a key into the local storage
 * @param  {key_id} 
 * @return {Boolean}  
 */

/*FIXME store key by using key_id as well*/
var store_key = function (parsedKey, privkey) {

	var key_id = parsedKey[0].key_id;
	var user_id = parsedKey[0].user_id; 
	var creation_date = parsedKey[0].creation_date;
	/*Convert iso time to unix time*/
	creation_date = new Date(creation_date);
	creation_date = creation_date.getTime()/1000;

	/*
	* clear all keys
	* clear_all();
	*/

	/*FIXME: For the porpuse of the prototype we assume a id*/
	var store_id = "safereview";

	/*remove the key if it is already stored*/
	remove_obj (store_id).then(function(result){
		if (result == 0){
			var msg = "The key assinged to "+ store_id + "is removed"
			/*FIXME: What kind of action ?*/
		}else
			var msg = "There is no such key stored!"
			/*FIXME: What kind of action ?*/
	});


	
	/*store privkey, keyid, creation_date, using a fix store_id*/
	store_obj (store_id, [privkey, key_id, creation_date] ).then(function(result){
		if (result == 0){
			var msg = "New private key " + key_id + " for " + user_id + 
				" is successfully imported into the key ring."
			window.alert(msg);
			window.close();
		}else{
			window.alert("Key store is failed. Please try again!");
			//window.close();
		}
	});

	/*Check if the key is stored 
	chrome.storage.onChanged.addListener(function(changes, namespace) {
		var key;
		for (key in changes) {
			var storageChange = changes[key];
			console.log('Storage key "%s" in namespace "%s" changed. ' +
			      'Old value was "%s", new value is "%s".',
			      key,
			      namespace,
			      storageChange.oldValue,
			      storageChange.newValue);
		}
	});*/
}


/**
 * Store an object in local storage
 * @param  {obj} 
 * @param  {obj_di} 
 * @return {callback}  Callback on success, or on failure 
 */
var store_obj = function(id, obj) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({[id]: obj}, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(0);
      }
    });
  });
};


/**
 * Load the key form local storage
 * @param  {key_id} 
 * @param  {key_info} 
 * @return {key_info}  
 */
var retrieve_key = function(id, key_info) {
	/*get the key id and pass it to another function to read info*/
	return retrieve_obj(id).then(
		privkey_info => get_key_info(privkey_info, key_info));			
}


/**
 * Retrieve an object from local storage
 * @param  {obj_di} 
 * @return {item}  the stored item 
 */
var retrieve_obj = function(id) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(id, items => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(items[id]);
      }
    });
  });
};


/*
*extract the info of stored key
*{store_id: [privkey, key_id, creation_date]}
*/
var get_key_info = function (privkey_info, key_info) {
	var parsedKey = openpgp.key.readArmored(privkey_info[0]);
	key_info.push(parsedKey);
	key_info.push(privkey_info[1]);
	key_info.push(privkey_info[2]);
}


/**
 * Remove an object from local storage
 * @param  {obj_di} 
 * @return {callback}  Callback on success, or on failure
 */
var remove_obj = function(id) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(id, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(0);
      }
    });
  });
};


/**
 * Clear all stored objects
 * @return {callback}  Callback on success, or on failure
 */
var clear_all = function() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(0);
      }
    });
  });
};



/**
 * Sing commit using pgp key
 * @param  {data} plain_text
 * @param  {user_id} take it to retrieve priv key
 * @return {String} singed message pgp_message
 */
function signMessage (user_id, data, callback){

	/*FIXME: For the porpuse of the prototype we assume a id*/
	var user_id = "safereview";
	
	/* Load the key form local storage */
	var key_info = [];
	retrieve_key (user_id, key_info).then(function(){

		var privKeyObj = key_info[0];
		/*check if the key is found*/
		if (privKeyObj.err) {
			window.alert("Private key is not found!");
			close();
		}else {
			/*get the first key retrieved from local storage*/
			privKeyObj = privKeyObj.keys[0]
			/*FIXME take passphrase
			* var passphrase='';
			* privKeyObj.decrypt(passphrase);
			*/

			/*signature parametes*/
			var options = {
				data: data.toString(),
				privateKeys: privKeyObj,
				detached: false,
				armor: true
			};

			/*sign the final message*/
			openpgp.sign(options).then(function(result){
				callback(result.data);
			});
		}


	});
}



/*Event Listeners*/
document.addEventListener('DOMContentLoaded', function () {

	var key_up, key_imp, key_gen;
	key_up = document.getElementById('uploaded_files');
	key_imp = document.getElementById('key_import');
	key_gen = document.getElementById('key_generate');
	if (key_up)
		key_up.addEventListener(
		'click', upload_key);

	if (key_imp)
		key_imp.addEventListener(
		'click', import_key);

	if (key_gen)
		key_gen.addEventListener(
		'click', generate_key);
});

