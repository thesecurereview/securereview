"use strict";

/* object types: encoded in bits*/
const types = {
	commit: 0b0010000,
	tree: 0b0100000,
	blob: 0b0110000,
	tag: 0b1000000
}



/* Create the wantpackLine via browser*/
function wantPackLine (wants, haves){

	/*form Capabilities*/
	let caps = [
		'multi_ack_detailed',
		'no-done',
		'side-band-64k',
		'thin-pack',
		'ofs-delta',
		'agent=agent=JGit/4.7.1.201706071930-r'
	]
	caps = ['ofs-delta']
  	caps = ` ${caps.join(' ')}`

	/* Write oids (need to be fetched) into the pack file*/
	let packstream = getStream()

 	//wants = [...new Set(wants)] // remove duplicates
	for (const oid of wants) {
		let firstLine = `want ${oid}${caps}\n`
		packstream.write(
			packLineEncode(firstLine)
		)
		caps = ''
	}

	//FIXME add haves
	for (const oid of haves) {
		packstream.write(
			packLineEncode(`have ${oid}\n`)
		)
	}

	packstream.write(packLineFlush())
 	packstream.end(packLineEncode(`done\n`))

	return packstream	
}



/* Send the pack file via browser*/
var sendPackLine = function (
	repo_url, auth, baseBranch, 
	newHead, oldHead, objects, callback){ 

	/*discover the remote server*/
	let res = discover({
		service: 'git-receive-pack',
		repo_url,
		auth
	}, function (response) {

		let {capabilities, refs} = response

		//FIXME use capabilities
		// Get server capabilities
		capabilities = capabilities.slice(-1)[0].split('/')[1].split('-')
		const caps = "report-status side-band-64k"

		//get head of the base branch
		//FIXME: Make it automatic 
		/*For Github
		let ref = `refs/heads/${baseBranch}`
		oldHead = refs.get(ref)*/
		

		// FIXME For Gerrit: baseBranch=change-Id
		let ref = `refs/heads/ref/changes/${baseBranch}`
		ref = `refs/changes/99/299`
		//console.log(`${oldHead} ${newHead} ${ref}\0 ${caps}`)

		// Write header of the pack file
		let packstream = getStream()
		packstream.write(
			packLineEncode(`${oldHead} ${newHead} ${ref}\0 ${caps}`)
		)
		packstream.write(packLineFlush())

		// Write objects into the pack file
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

/* Create the packLine*/
var packObjects = async function ({
	objects,
	outputStream
}) {
	/*call pad function*/
	let pad = getPad()

	/*create the hash function*/
	//TODO: let hash = sha1.create();
	let hash = getSha1();

	/*write chunk of data*/
	function write (chunk, enc) {
		outputStream.write(chunk, enc)
		hash.update(chunk, enc)
	}

	/*wrtie an object*/
	function writeObject ({ stype, object }) {

		let type = types[stype]
		if (type === undefined) throw new Error('Unrecognized type: ' + stype)

		let lastFour, multibyte, length

		/*get object length*/
		length = object.length

		/* part of the variable-length encoded number is encoded in bit 7*/
		multibyte = length > 0b1111 ? 0b10000000 : 0b0

		/* Last four bits of length is encoded in bits 3210*/
		lastFour = length & 0b1111

		/* Discard those bits*/
		length = length >>> 4

		/*
		* The first byte is then 
		* (1-bit multibyte?), (3-bit type), (4-bit least sig 4-bits of length)
		*/
		let byte = (multibyte | type | lastFour).toString(16)

		write(byte, 'hex')

		/* Keep chopping away at length 7-bits at a time until its zero,
		* writing out the bytes in what amounts to little-endian order.
		*/
		while (multibyte) {
			multibyte = length > 0b01111111 ? 0b10000000 : 0b0
			byte = multibyte | (length & 0b01111111)
			write(pad(2, byte.toString(16), '0'), 'hex')
			length = length >>> 7
		}

		/* compress and write the object into packLine*/
		write(compressObject (object))
	}

	write('PACK')
	write('00000002', 'hex')

	/* Write a 4 byte (32-bit) int for number of objects*/ 
	write(pad(8, objects.length.toString(16), '0'), 'hex')

	/* Write new objects into the packLine */
	//objects = [["type", object], ...]
	for (var i=0; i<objects.length; i++) {
		let type = objects[i][0]
		let object = objects[i][1]

		writeObject({ write, object, stype:type })
	}

	/* Write SHA1 checksum*/

	let digest = hash.digest()
	outputStream.end(digest)

	return outputStream
}


