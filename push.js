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

	/*for (const oid of haves) {
		packstream.write(
			packLineEncode(`have ${oid}\n`)
		)
	}*/

	packstream.write(packLineFlush())
 	packstream.end(packLineEncode(`done\n`))

	return packstream	
}

