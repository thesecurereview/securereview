
//Get Git object mode
function mode2type (mode) {
	switch (mode) {
		case '040000': return 'tree'
		case '100644': return 'blob'
		case '100755': return 'blob'
		case '120000': return 'blob'
		case '160000': return 'commit'
	}
	throw new GitError(E.InternalFail, {
		message: `Unexpected GitTree entry mode: ${mode}`
	})
}


// Parse Tree Object
function parseBuffer (buffer) {
	let _entries = []
	let cursor = 0

	while (cursor < buffer.length) {

		let space = buffer.indexOf(32, cursor)
		if (space === -1) {
			throw new Error (
				`GitTree: Error parsing buffer at byte location ${cursor}: 
				Could not find the next space character.`
			)
		}

		let nullchar = buffer.indexOf(0, cursor)
		if (nullchar === -1) {
			throw new Error (
				`GitTree: Error parsing buffer at byte location ${cursor}: 
				Could not find the next null character.`
			)
		}

		let mode = buffer.slice(cursor, space).toString('utf8')
 		// makes it line up neater in printed output
		if (mode === '40000') mode = '040000'

		//Entry type
		let type = mode2type(mode)

		//Entry path
		let path = buffer.slice(space + 1, nullchar).toString('utf8')

		//Entry oid
		let oid = buffer.slice(nullchar + 1, nullchar + 21).toString('hex')

		_entries.push({ mode, path, oid, type })
		
		//read next entry
		cursor = nullchar + 21
	}

	return _entries
}
