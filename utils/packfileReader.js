
// src: https://github.com/tjfontaine/node-buffercursor
// but with the goal of being much lighter weight.
class BufferCursor {
  constructor (buffer) {
    this.buffer = buffer
    this._start = 0
  }
  eof () {
    return this._start >= this.buffer.length
  }
  tell () {
    return this._start
  }
  seek (n) {
    this._start = n
  }
  slice (n) {
    const r = this.buffer.slice(this._start, this._start + n)
    this._start += n
    return r
  }
  toString (enc, length) {
    const r = this.buffer.toString(enc, this._start, this._start + length)
    this._start += length
    return r
  }
  write (value, length, enc) {
    const r = this.buffer.write(value, this._start, length, enc)
    this._start += length
    return r
  }
  readUInt8 () {
    const r = this.buffer.readUInt8(this._start)
    this._start += 1
    return r
  }
  writeUInt8 (value) {
    const r = this.buffer.writeUInt8(value, this._start)
    this._start += 1
    return r
  }
  readUInt16BE () {
    const r = this.buffer.readUInt16BE(this._start)
    this._start += 2
    return r
  }
  writeUInt16BE (value) {
    const r = this.buffer.writeUInt16BE(value, this._start)
    this._start += 2
    return r
  }
  readUInt32BE () {
    const r = this.buffer.readUInt32BE(this._start)
    this._start += 4
    return r
  }
  writeUInt32BE (value) {
    const r = this.buffer.writeUInt32BE(value, this._start)
    this._start += 4
    return r
  }
}


function decodeVarInt (reader) {
	let bytes = []
	let byte = 0
	let multibyte = 0
	do {
		byte = reader.readUInt8()
		// We keep bits 6543210
		const lastSeven = byte & 0b01111111
		bytes.push(lastSeven)
		// Whether the next byte is part of the variable-length encoded number
		// is encoded in bit 7
		multibyte = byte & 0b10000000
	} while (multibyte)
	// Now that all the bytes are in big-endian order,
	// alternate shifting the bits left by 7 and OR-ing the next byte.
	// And... do a weird increment-by-one thing that I don't quite understand.
	return bytes.reduce((a, b) => ((a + 1) << 7) | b, -1)
}


function otherVarIntDecode (reader, startWith) {
	let result = startWith
	let shift = 4
	let byte = null
	do {
		byte = reader.readUInt8()
		result |= (byte & 0b01111111) << shift
		shift += 7
	} while (byte & 0b10000000)

  	return result
}


// Read packfile index
class GitPackIndex {
	constructor (stuff) {
		Object.assign(this, stuff)
		this.offsetCache = {}
	}

	static async fromIdx ({ idx, getExternalRefDelta }) {
   		let reader = new BufferCursor(idx)
    		let magic = reader.slice(4).toString('hex')
		// Check for IDX v2 magic number
		if (magic !== 'ff744f63') {
			return // undefined
		}

		let version = reader.readUInt32BE()
		if (version !== 2) {
			throw new Error(`Unable to read version ${version} packfile IDX. 
				(Only version 2 supported)`)
		}

		if (idx.byteLength > 2048 * 1024 * 1024) {
			throw new Error(`To keep implementation simple, 
				the layer 5 feature is not implemented to support packfiles > 2GB in size.`)
		}

		// Skip over fanout table
		reader.seek(reader.tell() + 4 * 255)
		// Get hashes
		let size = reader.readUInt32BE()
		let hashes = []
		for (let i = 0; i < size; i++) {
			let hash = reader.slice(20).toString('hex')
			hashes[i] = hash
		}

		reader.seek(reader.tell() + 4 * size)
		// Skip over CRCs
		// Get offsets
		let offsets = new Map()
		for (let i = 0; i < size; i++) {
			offsets.set(hashes[i], reader.readUInt32BE())
		}

		let packfileSha = reader.slice(20).toString('hex')

		return new GitPackIndex({
			hashes,
			offsets,
			packfileSha
		})
  	}

	async read ({ oid }) {

		let start = this.offsets.get(oid)
		if (start)
			return this.readSlice({ start })
		else{
			//TODO capture missing objects
			console.log("Missing base object:", oid)
		}	
	}


	// Read slice in the packfile
	async readSlice({ start }) {

		if (this.offsetCache[start]) {
			return Object.assign({}, this.offsetCache[start])
		}
		this.readDepth++

		const types = {
			0b0010000: 'commit',
			0b0100000: 'tree',
			0b0110000: 'blob',
			0b1000000: 'tag',
			0b1100000: 'ofs_delta',
			0b1110000: 'ref_delta'
		}

		let raw = (await this.pack).slice(start)
		raw = createBuffer(raw)
		let reader = new BufferCursor(raw)
		let byte = reader.readUInt8()

		// Object type is encoded in bits 654
		let btype = byte & 0b1110000
		let type = types[btype]
		
		// The length encoding get complicated.
		// Last four bits of length is encoded in bits 3210
		let lastFour = byte & 0b1111
		let length = lastFour

		// Whether the next byte is part of the variable-length encoded number
		// It is encoded in bit 7
		let multibyte = byte & 0b10000000
		if (multibyte) {
			length = otherVarIntDecode(reader, lastFour)
		}

		// Handle deltified objects
		let object = null;
		let base = null;
		// ofs-delta encodes the offset of the base object
		if (type === 'ofs_delta'){
			let offset = decodeVarInt(reader)
			let baseOffset = start - offset
			;({ object: base, type } = await this.readSlice({ start: baseOffset }))
		}

		// ref-delta directly encodes 20-byte base object name.
		if (type === 'ref_delta') {
			let oid = reader.slice(20).toString('hex')
			;({ object: base, type } = await this.read({ oid }))
		}

		// Handle undeltified objects
		let buffer = raw.slice(reader.tell())

		// Decompress the object
		object = decompressObject(buffer)

		// Assert that the object length is as expected.
		if (object.byteLength !== length) {
			throw new Error(`Packfile told us object would have length ${length} 
					but it had length ${object.byteLength}`)
		}

		if (base) {
			let applyDelta = getGitApplyDelta();
			object = createBuffer(applyDelta(object, base))
		}

		// Cache the result based on depth
		// tuned for speed / memory usage tradeoff
		if (this.readDepth > 3) {
			this.offsetCache[start] = { type, object }
		}

	    	return { type, format: 'content', object }
	}
}


/*
* Read from packfile
*/
var readFromPack = async function (pack) {
	const listpackTypes = {
		1: 'commit',
		2: 'tree',
		3: 'blob',
		4: 'tag',
		6: 'ofs-delta',
		7: 'ref-delta'
   	}

 	let packfileSha = toHexString(pack.slice(-20))

	let hashes = []
	let objectTypes = new Map()
	let offsets = new Map()
	let totalObjectCount = null
   	let offsetToObject = {}
	let objectInfo = {}

    	await listPack([pack], ({ data, type, reference, offset, num }) => {
		if (totalObjectCount === null) totalObjectCount = num

		// Change type from a number to a meaningful string
		type = listpackTypes[type]


		if (['commit', 'tree', 'blob', 'tag'].includes(type)) {
			offsetToObject[offset] = {
			  type,
			  offset
			}
		} else if (type === 'ofs-delta') { //FIXME:
			offsetToObject[offset] = {
			  type,
			  offset
			}
		} else if (type === 'ref-delta') {
			offsetToObject[offset] = {
			  type,
			  offset
			}
		}
    	})

	console.log("Number of fetched objects:", Object.keys(offsetToObject).length)
	console.log(offsetToObject)
	// We need to know the lengths of the slices to compute the CRCs.
	let offsetArray = Object.keys(offsetToObject).map(Number)

	for (let [i, start] of offsetArray.entries()) {
		let end =
		i + 1 === offsetArray.length ? pack.byteLength - 20 : offsetArray[i + 1]
		let o = offsetToObject[start]
		o.end = end
	}

	// Read Git index
	const p = new GitPackIndex({
		pack: Promise.resolve(pack),
		packfileSha,
		hashes,
		offsets,
		objectTypes
	})

	// Call readSlice to unwrap objects!
    	for (let offset in offsetToObject) {
		offset = Number(offset)

		let o = offsetToObject[offset]
		if (o.oid) continue

		try {
			p.readDepth = 0

			// Extract the object content from packfile
			let { type, object } = await p.readSlice({ start: offset })

			//compute Git object sha1
			oid = getObjectHash (objectWrap(type, object))
			o.oid = oid
			hashes.push(oid)
			offsets.set(oid, offset)
			objectTypes.set(oid, type)

			//Store the object info
			objectInfo[oid] = {
				type: type,
				content: objectReader (type, object)
			}

		} catch (err) {
			console.log('ERROR', err)
			continue
		}
   	}

   	return objectInfo
}
