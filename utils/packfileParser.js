//listPack
var listPack = async function (stream, onData) {

	//let reader =  getStreamReader(stream)
	let reader =  new StreamReader(stream)

  	let hash = getSha1();

	//Check the PACK header
	let PACK = await reader.read(4)
	hash.update(PACK)
	PACK = PACK.toString('utf8')
	if (PACK !== 'PACK') {
		throw new Error(`Invalid PACK header '${PACK}'`)
	}

	//Get the PACK version
	let version = await reader.read(4)
	hash.update(version)
	version = version.readUInt32BE(0)
	if (version !== 2) {
		throw new Error(`Invalid packfile version: ${version}`)
	}

	//Get the number of objects
	let numObjects = await reader.read(4)
	hash.update(numObjects)
	numObjects = numObjects.readUInt32BE(0)
	// If (for some godforsaken reason) this is an empty packfile, abort now.
	if (numObjects < 1) return


	while (!reader.eof() && numObjects--) {
		let offset = reader.tell()

	
	    	let { type, length, ofs, reference } = await parseHeader(reader, hash)
		
		let inflator = getPakoInflate()
		while (!inflator.result) {
			let chunk = await reader.chunk()
			if (reader.ended) break
			inflator.push(chunk, false)
			
		      	if (inflator.err) {
				throw new GitError(E.InternalFail, {
				  	message: `Pako error: ${inflator.msg}`
				})
		      	}
			
		      	if (inflator.result) {
				if (inflator.result.length !== length) {
					throw new GitError(E.InternalFail, {
						message: `Inflated object size is different from that stated in packfile.`
					})
				}

				// Backtrack parser to where deflated data ends
				await reader.undo()
				let buf = await reader.read(chunk.length - inflator.strm.avail_in)
				hash.update(buf)
				let end = reader.tell()

				onData({
					data: inflator.result,
					type,
					num: numObjects,
					offset,
					end,
					reference,
					ofs
				})
		      	} else {
				hash.update(chunk)
		      	}
		}
  	}

}


/**
* Parse the packfile header
*/
async function parseHeader (reader, hash) {
	// Object type is encoded in bits 654
	let byte = await reader.byte()
	hash.update(createBuffer([byte]))

	let type = (byte >> 4) & 0b111
	// The length encoding get complicated.
	// Last four bits of length is encoded in bits 3210
	let length = byte & 0b1111
	// Whether the next byte is part of the variable-length encoded number
	// is encoded in bit 7
	if (byte & 0b10000000) {
		let shift = 4
		do {
			byte = await reader.byte()
			hash.update(createBuffer([byte]))
			length |= (byte & 0b01111111) << shift
			shift += 7
		} while (byte & 0b10000000)
	}


	// Handle deltified objects
	let ofs
	let reference
	if (type === 6) {
		let shift = 0
		ofs = 0
		let bytes = []
		do {
			byte = await reader.byte()
			hash.update(createBuffer([byte]))
			ofs |= (byte & 0b01111111) << shift
			shift += 7
			bytes.push(byte)
		} while (byte & 0b10000000)

		reference = createBuffer(bytes)
	}

	//
	if (type === 7) {
		let buf = await reader.read(20)
		hash.update(buf)
		reference = buf
	}

	return { type, length, ofs, reference }
}
