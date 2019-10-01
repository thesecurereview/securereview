//Create new commit/blob/tree objects
function createGitObject(type, content) {

    /*
     * blob: ["blob" + <size_of_file> + "\0" + <contents>]
     * tree: [content size]\0[Object Entries]
     * entry=[mode, type, hash, name]
     * [mode] [Object name]\0[SHA-1 of referencing blob or tree]
     */

    if (type == "blob")
        content = normalize(content)

    //toObject
    let object;
    if (type == "tree") {
        object = treeObject(content)
    } else {
        object = createBuffer(content, 'utf8')
    }

    //wrap object into buffer
    let wrap = objectWrap(type, object)

    //compress & write file
    let compress = compressObject(wrap)

    return {
        id: getObjectHash(wrap), //object hash
        object: object
    }
}


// Get object hash
function getObjectHash(object_wrap) {

    var hash = sha1.create();
    hash.update(object_wrap);

    return hash.hex();
}
