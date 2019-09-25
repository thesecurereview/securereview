// Costum funciton to parse change info
function jsonifyResponse({
    content,
    json
}) {

    // Remove GERRIT magic JSON prefix
    if (content.startsWith(GERRIT_MAGIC_JSON_PREFIX))
        content = content.substr(GERRIT_MAGIC_JSON_PREFIX.length);

    // Remove the last line
    let idx = content.lastIndexOf("\n");
    content = content.substr(0, idx);

    if (json == false)
        return content;

    return JSON.parse(content)
}


// Parse GET response
function parseGETResponse(data, service) {

    /*
    * response lines
    * 0: <Length># service=git-receive-pack"
    " 1: <Length>SHA1 REF\0CAPS"
    " 2: <Length>SHA1 REF1"
    " 3: <Length>SHA1 REF2"
    " 4: <Length>SHA1 REF3"
    " ..."
    " n: 0000"
    */

    /*
     * Check if the response is OK, and
     * remove the first and last line to get refs
     */
    var lines = data.toString('utf8').trim().split('\n')
    var resHead = lines.shift()
    resHead = resHead.toString('utf8').replace(/\n$/, '')

    // Check the first line: service info
    if (!(resHead.includes(`service=${service}`))) {
        throw new Error(
            `Expected '# service=${service}\\n' 
			but got '${resHead.toString('utf8')}'`
        )
    }

    //Remove the last line: 0000
    lines.pop()

    let [refLine, capLine] = lines[0].split('\0')
    var capabilities = capLine.split(' ')

    //remove the first empty element, FIXME: check it for GitHub
    capabilities.shift()

    //remove caps from the first line
    lines[0] = refLine

    // Map over refs
    const refs = new Map()
    var symrefs = ""
    for (let line of lines) {
        let [ref, name] = line.split(' ')
        //remove the length from the beginning
        if (ref.length > 40) ref = ref.slice(-40)
        refs.set(name, ref)
    }

    // Check if there is Symrefs in capabilities.
    for (let i in capabilities) {
        if (capabilities[i].startsWith('symref=')) {
            symrefs = capabilities[i]
            symrefs = symrefs.replace("symref=", "");
            capabilities.splice(i, 1)
        }
    }

    return {
        refs: refs,
        symrefs: symrefs,
        capabilities: capabilities
    }
}


// Prase post response of packfile
function parsePackfileResponse(data) {

    /*TODO: 	
     * - Support other response types like string
     *	if (typeof(data) == "string")
     * - Support other caps like 'side-band'
     * - Capture acks and unshallows
     */

    /*
    * If 'side-band' or 'side-band-64k' capabilities are specified by the client, 
    * the server will send the packfile data multiplexed.

    * Each packet starting with the packet-line length of the amount of data
    * that follows, followed by a single byte specifying the sideband

    * In 'side-band' mode, it will send up to 999 data bytes plus 1 control code, 
    * for a total of up to 1000 bytes in a pkt-line.  
    * In 'side-band-64k' mode, it will send up to 65519 data bytes plus 1 control code, 
    * for a total of up to 65520 bytes in a pkt-line.

    * The sideband byte could be '1', '2' or '3'. 
    * '1': contains packfile data
    * '2': is used for progress information that the client will print to stderr
    * '3': is used for error information.

    * If no 'side-band' capability was specified, 
    * the server will stream the entire packfile without multiplexing.
    */

    /*
    * We only used 'side-band' capability, 
    * so the response data follows the below pattern
    First line:
    	No shallow
     		"008NAK\n" or "00000008NAK\n" 
     	shallow
    		0034shallow <SHA1>0034shallow <SHA1>....\n"
    Second line:
     	PACK0002..."
    */

    // Access Uint8Array in ArrayBuffer and convert it to string
    let uint8View = new Uint8Array(data);
    data = ab2str(uint8View)

    // Extract the first line
    let idx = data.indexOf("\nPACK")
    let packetLine = data.slice(0, idx)

    // Packfile is Uint8Array except the first line 
    let packfile = uint8View.slice(idx + 1, uint8View.byteLength)

    // Parse the firts line
    // TODO: Make if more general
    let ending = "00000008NAK"
    let nak = packetLine.endsWith(ending) ? true : false

    // Remove nak ending and capture shallows (if any)
    packetLine = packetLine.slice(0, packetLine.indexOf(ending))

    let shallows = []
    let unshallows = []
    if (packetLine.length > 1) {
        packetLine = packetLine.split("0034shallow")
        //Ignore the first element
        for (var i = 1; i < packetLine.length; i++) {
            // Check if shallow ids are correct 
            let oid = packetLine[i].trim()
            if (oid.length != 40)
                throw new Error('Shallow id is corrupted')
            else
                shallows.push(oid)
        }
    }

    return ({
        packfile,
        shallows,
        nak
    })
}


// Parse response
function parseMSGResponse(method, res) {

    if (method == "PUT") {
        // Check for 204 No Content success code
        if (res.statusCode == 204) {
            return true
        }
        /*else
        	//FIXME raise a better error
        	return throw new Error(`The commit message is not updated`)
        */
    }
    if (method == "POST") {
        // Check for 204 No Content success code
        if (res.statusCode == 204) {
            return refreshPage(url)
        }
        /*else
        	//FIXME raise a better error
        	return throw new Error(`The updated message is not published`)
        */
    }
}


// Parse the final server's response

var parseSendPackResult = function(response) {

    /*FIXME check response lines
    let lines = response.split('\n')

    if (!line.startsWith('unpack ')) {
    	window.alert(line)
    }*/

    if (!response.includes('unpack ')) {
        window.alert(line)
    } else {
        //refresh the page If the unpack is ok
        //refreshPage(file_name)
    }

}


// Filter capabilities 
function filterCaps(capabilities) {

    /*
    * A complete list of caps is available at:
    * https://git-scm.com/docs/protocol-capabilities/2.4.0
    * https://github.com/git/git/blob/master/fetch-pack.c#L884
    * https://github.com/git/git/blob/master/upload-pack.c#L891
    * https://github.com/schacon/gitscm/blob/master/public/docs/gitserver.txt#L516
    */

    capabilities = arrayIntersect(capabilities,
        [
            //no-done allows the sender to immediately send a pack following its first "ACK obj-id ready" message.
            'no-done',

            'shallow',

            //multi_ack_detailed allows to better understand the server's in-memory state
            //'multi_ack_detailed', 

            // multi_ack allows the server to return "ACK obj-id continue" 
            // as soon as it finds a commit that it can use as a common base
            //'multi_ack',

            // If 'side-band' capability is  not specified, 
            // the server will stream the entire packfile without multiplexing. 
            //'side-band'
            //'side-band-64k',

            //A thin_pack is one with deltas which reference base objects not contained within the pack
            //'thin-pack',

            //client can understand PACKv2 with delta referring to its base by position in pack rather than by an obj-id.
            //'ofs-delta', 

            //'include-tag',

            //'no-progress',

            //`agent=${agent}`
        ]
    )

    return capabilities
}
