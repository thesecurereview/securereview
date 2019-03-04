/**
* Create a packfile to fetch git object
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
* Fetch Git objects from the server
*/
function fetchObjects(repo_url, target, changeNumber, callback){
	
	// Set upload service 
	var service = UPLOADPACK

	// Run git-upload-pack process
	get_req(repo_url, service, auth, function (result){

 		var httpResponse = parseGETResponse(result, service)

		/*
		* Filter capabilities 
		* If 'side-band' capability is  not specified, 
		* the server will stream the entire packfile without multiplexing.
		*/ 
		const capabilities = computeIntersect(
			httpResponse.capabilities,
			[
			// multi_ack allows the server to return "ACK obj-id continue" 
			// as soon as it finds a commit that it can use as a common base
			/*'multi_ack' */
			//multi_ack_detailed is an extension of multi_ack 
			//that permits client to better understand the server's in-memory state
			'multi_ack_detailed', 
			//no-done allows the sender to immediately send a pack following its first "ACK obj-id ready" message.
			'no-done'
			/*'side-band-64k',
			//A thin_pack is one with deltas which reference base objects not contained within the pack
			'thin-pack',
			//client can understand PACKv2 with delta referring to its base by position in pack rather than by an obj-id.
			'ofs-delta', 
			`agent=${agent}`*/
			]
		)

		// Form Capabilities
	  	var caps = ` ${capabilities.join(' ')}`

		/* 
		* Assume we have the parent, and want the head
		* Assume wants = head, haves=parent
		*/
		console.log(httpResponse.refs)//.get(`refs/heads/${changeNumber}`))
		let head = httpResponse.refs.get(`refs/heads/${target}`)
		let shallows = httpResponse.capabilities.includes('shallow') ? [head] : []
		let wants = [head]
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

				// Read the packfile data
				readFromPack(packfile).then(function(result){
					callback(head, result)
				});
			}
		);
	});
}

	
// Get the tree hash of a commit object
function getTreeHash(repo_url, branch, changeNumber, callback){

	fetchObjects(repo_url, branch, changeNumber, 
		function(head, objects){

			//read the commit object
			var commit = objects[head]
			callback(parseGitObject(commit).tree)
		}
	);
}


function parseGitObject(object){

	var treeHash = object.slice(
		object.indexOf('tree ') + 5, 
		object.indexOf('\nparent')
	)	

	//TODO: extract other info
	return {
		tree: treeHash
		}
}

