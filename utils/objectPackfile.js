"use strict";
// object types: encoded in bits
const types = {
    commit: 0b0010000,
    tree: 0b0100000,
    blob: 0b0110000,
    tag: 0b1000000
}


//Create a packfile to fetch Git objects
function fetchPackLine({
    caps = [],
    wants = [],
    haves = [],
    shallows = [],
    //depth = null, //Limit fetching to the specified number of commits from the tip of each remote branch history	
    deepen = null, //Limit fetching to the specified number of commits from the current shallow boundary
    since = null, //Shorten the history of a shallow repository to include all reachable commits after <date>
    exclude = [] //Shorten the history of a repository to exclude commits reachable from a specified remote branch/tag. 
}) {
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

    if (deepen !== null) {
        let packLine = `deepen ${deepen}\n`
        packstream.write(
            packLineEncode(packLine)
        )
    }

    if (since !== null) {
        let packLine = `deepen-since ${Math.floor(since.valueOf() / 1000)}\n`
        packstream.write(
            packLineEncode(packLine)
        )
    }

    for (const oid of exclude) {
        let packLine = `deepen-not ${oid}\n`
        packstream.write(
            packLineEncode(packLine)
        )
    }

    packstream.write(packLineFlush())

    //FIXME check if works well
    for (const oid of haves) {
        let packLine = `have ${oid}\n`
        packstream.write(
            packLineEncode(packLine)
        )
    }

    packstream.end(packLineEncode(`done\n`))

    return packstream
}


// Fetch Git objects from the server
var fetchObjects = async function({
    repo_url,
    wants,
    haves,
    since,
    exclude,
    refs
}, callback) {

    // Set upload service 
    var service = UPLOADPACK

    // Run git-upload-pack process
    get_req(repo_url, service, auth, function(httpResponse) {

        let capabilities = filterCaps(httpResponse.capabilities)

        // WANTS: Check if wants are provided, otherwise take them from refs
        if (!wants) {
            for (i in refs) {
                let head;
                if (refs[i].startsWith('refs'))
                    head = httpResponse.refs.get(refs[i])
                else
                    head = httpResponse.refs.get(`refs/heads/${refs[i]}`)

                wants.push(head)
            }
        }

        // HAVES: Check if haves are provided
        if (!haves) {
            haves = []
        }

        // SHALLOWS: Check if shallow is supported
        let shallows = capabilities.includes('shallow') ? [...wants] : []

        // DEEPEN SINCE
        since = capabilities.includes('deepen-since') ? [...since] : null

        // DEEPEN NOT
        exclude = capabilities.includes('deepen-not') ? [...exclude] : []

        // DEEPEN //TODO: Support for any deepn number
        let deepen = 1

        // CAPS
        capabilities = ` ${capabilities.join(' ')}`

        // Create the packstream
        var stream = fetchPackLine({
            capabilities,
            wants,
            haves,
            shallows,
            since, //since = new Date("Wed Mar 13 2019 12:06:21 GMT-0400")
            exclude,
            deepen
        });

        // Ask for the objects (wants)
        post_req(
            repo_url,
            service,
            auth,
            stream,
            (result) => {

                /*
                //TODO: Parse the packfile header
                let { packfile, shallows, nak } = 
                	parsePackfileResponse(result)

                //Check if nak message is received
                if (nak != true)
                	throw new Error ('The packfile is not retrieved correctly')
                */

                result = new Uint8Array(result);
                //data = data.slice(8, data.byteLength) // "008NAK\n"
                let packfile = result.slice(12, result.byteLength) //"00000008NAK\n"

                //TODO: check the packfile sha1
                let packfileSha = toHexString(packfile.slice(-20))

                // Read the packfile
                readFromPack(packfile).then(function(data) {
                    callback({
                        data
                    })
                });
            }
        );
    });
}


//Create a packfile to push Git objects
var pushPackLine = async function({
    objects,
    outputStream
}) {
    let pad = getPad();
    let hash = getSha1();

    // write chunk of data
    function write(chunk, enc) {
        outputStream.write(chunk, enc)
        hash.update(chunk, enc)
    }

    function writeObject({
        stype,
        object
    }) {

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
        write(compressObject(object))
    }

    write('PACK')
    write('00000002', 'hex')

    // Write a 4 byte (32-bit) int for number of objects
    write(pad(8, objects.length.toString(16), '0'), 'hex')

    // Write new objects into the packLine 
    //objects = [["type", object], ...]
    for (var i = 0; i < objects.length; i++) {
        let type = objects[i][0]
        let object = objects[i][1]

        writeObject({
            write,
            object,
            stype: type
        })
    }

    // Write SHA1 checksum
    let digest = hash.digest()
    outputStream.end(digest)

    return outputStream
}


//Push Git objects to the server
var pushObjects = function({
    auth,
    branch,
    changeNumber,
    ref,	
    repo_url,
    oldHead,
    newHead,
    objects
}, callback) {

    // Set upload service 
    var service = RECEIVEPACK;

    // Run git-upload-pack process
    get_req(repo_url, service, auth, (httpResponse) => {
        // TODO: use server's capabilities in a better way
        let {
            capabilities,
            refs
        } = httpResponse;

        // If no 'side-band' capability was specified, the server will stream the
        // entire packfile without multiplexing.
        const caps = "report-status side-band-64k no-thin";

	if (typeof ref == 'undefined') {
            //FIXME: Form the change ref
            let ref = `refs/changes/01/1/2`;
            ref = `refs/heads/ref/changes/${changeNumber}`;
            ref = `HEAD:refs/for/${changeNumber}`;
            ref = `refs/heads/${branch}`;
	}

        // Write header of the pack file
        let packstream = getStream();
        packstream.write(
            packLineEncode(`${oldHead} ${newHead} ${ref}\0 ${caps}`)
        );
        packstream.write(packLineFlush());

        // Write objects into the packfile
        pushPackLine({
            objects,
            outputStream: packstream
        });

        // POST the packfile
        connect({
            service: RECEIVEPACK,
            repo_url,
            auth,
            stream: packstream
        }, (result) => {
            callback(result);
        });
    });
}
