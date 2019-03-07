
//Get tree entry mode
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
	let entries = []
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

		entries.push({ mode, path, oid, type })
		
		//read next entry
		cursor = nullchar + 21
	}

	return entries
}


// Unwrap a Git Object buffer
function objectReader(type, buffer){

	/*/ FIXME: Check the if unwrap is correct
	let unwrap = buffer.slice(s + 1, i) // get object content
	let unwrap = buffer.slice(0, i) // get object content
	let s = buffer.indexOf(32) // first space
	let i = buffer.indexOf(0) // first null value
	// TODO: verify buffer length
	let actualLength = buffer.length - (i + 1)*/

	let unwrap
	if (type == "tree")
		unwrap = parseBuffer (buffer)
	else
		unwrap = buffer.toString('utf8')

	return unwrap
}
