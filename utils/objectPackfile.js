"use strict";

// object types: encoded in bits
const types = {
	commit: 0b0010000,
	tree: 0b0100000,
	blob: 0b0110000,
	tag: 0b1000000
}


/**
* Create a packfile to push Git objects
*/
var packObjects = async function ({
	objects,
	outputStream
}) {
	let pad = getPad()
	let hash = getSha1();

	// write chunk of data
	function write (chunk, enc) {
		outputStream.write(chunk, enc)
		hash.update(chunk, enc)
	}

	function writeObject ({ stype, object }) {

		let type = types[stype]
		if (type === undefined) throw new Error('Unrecognized type: ' + stype)

		let lastFour, multibyte, length

		length = object.length
		// part of the variable-length encoded number is encoded in bit 7
		multibyte = length > 0b1111 ? 0b10000000 : 0b0
		// Last four bits of length is encoded in bits 3210
		lastFour = length & 0b1111
		length = length >>> 4

		
		//(1-bit multibyte?), (3-bit type), (4-bit least sig 4-bits of length)
		let byte = (multibyte | type | lastFour).toString(16)

		write(byte, 'hex')

		// Keep chopping away until its zero,
		// Write out the bytes in little-endian order
		
		while (multibyte) {
			multibyte = length > 0b01111111 ? 0b10000000 : 0b0
			byte = multibyte | (length & 0b01111111)
			write(pad(2, byte.toString(16), '0'), 'hex')
			length = length >>> 7
		}

		// compress and write the object into packLine
		write(compressObject (object))
	}

	write('PACK')
	write('00000002', 'hex')

	// Write a 4 byte (32-bit) int for number of objects
	write(pad(8, objects.length.toString(16), '0'), 'hex')

	// Write new objects into the packLine 
	//objects = [["type", object], ...]
	for (var i=0; i<objects.length; i++) {
		let type = objects[i][0]
		let object = objects[i][1]

		writeObject({ write, object, stype:type })
	}

	// Write SHA1 checksum
	let digest = hash.digest()
	outputStream.end(digest)

	return outputStream
}


/**
* Create a packfile to fetch Git objects
*/
function wantPackLine ({
	caps,
	wants,
	haves,
	shallows,
	depth 
}){
	let packstream = getStream()

 	//wants = [...new Set(wants)] // remove duplicates
	for (const oid of wants) {
		let packLine = `want ${oid}${caps}\n`
		packstream.write(
			packLineEncode(packLine)
		)
		//caps go only with the first line
		caps = ''
	}

	for (const oid of shallows) {
		let packLine = `shallow ${oid}\n`
		packstream.write(
			packLineEncode(packLine)
		)
	}
	if (depth !== null) {
		let packLine = `deepen ${depth}\n`
		packstream.write(
			packLineEncode(packLine)
		)
	}

	//FIXME check if works well
	for (const oid of haves) {
		let packLine = `have ${oid}\n`
		packstream.write(
			packLineEncode(packLine)
		)
	}

	packstream.write(packLineFlush())
 	packstream.end(packLineEncode(`done\n`))

	return packstream	
}


/**
* Push Git objects to the server
*/
var pushObjects = function ({ 
	repo_url, auth, branch, changeNumber, 
	oldHead, newHead, objects }, callback){ 

	// Set upload service 
	var service = RECEIVEPACK

	// Run git-upload-pack process
	get_req(repo_url, service, auth, function (httpResponse){

		// TODO: use server's capabilities in a better way
		let {capabilities, refs} = httpResponse

		// If no 'side-band' capability was specified, the server will stream the
		// entire packfile without multiplexing.
		const caps = "report-status side-band-64k no-thin"

		let ref;
		if (branch == null){//Update the change branch
			//FIXME: Form the change ref
			ref = `refs/changes/01/1/2`
			ref = `refs/heads/ref/changes/${changeNumber}`
			ref = `refs/for/${changeNumber}`
		}
		else
			ref = `refs/heads/${branch}`

		// Write header of the pack file
		let packstream = getStream()
		packstream.write(
			packLineEncode(`${oldHead} ${newHead} ${ref}\0 ${caps}`)
		)
		packstream.write(packLineFlush())

		// Write objects into the packfile
		packObjects({
			objects,
			outputStream: packstream
		})

		// POST the packfile
		let streamData = connect({
			service: 'git-receive-pack',
			repo_url,
			auth,
			stream: packstream
		}, function (result) {
			callback(result)
		})
	})
}


/**
* Fetch Git objects from the server
*/
var fetchObjects = async function({ repo_url, heads, refs }, callback){
	
	// Set upload service 
	var service = UPLOADPACK

	// Run git-upload-pack process
	get_req(repo_url, service, auth, function (httpResponse){

		let caps = formCaps(httpResponse.capabilities)
		
		//Check if heas are provided, otherwise take from refs
		let wants = [];
		if (!heads) {
			for (i in refs){
				let head;
				if (refs[i].startsWith('refs'))
					head = httpResponse.refs.get(refs[i])
				else
					head = httpResponse.refs.get(`refs/heads/${refs[i]}`)
		
				wants.push(head)
			}	
		}
		else
			wants = [...heads]

		let shallows = httpResponse.capabilities.includes('shallow') ? [...heads] : []
		let haves = []
		let depth = 1

		// Create the packstream
		var stream = wantPackLine ({
			    caps,
			    wants,
			    haves,
			    shallows,
			    depth 
		});

		// Ask for the objects (wants)
		post_req(
			repo_url,
			service,
			auth,
			stream, 
			function (result) {
				let packfile = parsePackfileResponse(result)
				//TODO: check the packfile sha1
				// sha1 is the last 20 chars 
				let packfileSha = toHexString(packfile.slice(-20))

				// Read the packfile
				readFromPack(packfile).then(function(data){
					callback({ data })
				});
			}
		);
	});
}



