// Push commit to the server
function prepareCommit({
    parents,
    treeHash,
    commitMessage
}, callback) {

    //Generate timestamp at the client side and add it to author
    let [timestamp, timezoneOffset] = determineTime();
    AUTHOR["timestamp"] = timestamp;
    AUTHOR["timezoneOffset"] = timezoneOffset;

    // Create a new signed commit
    createSignedCommit({
        tree: treeHash,
        parents,
        author: AUTHOR,
        message: commitMessage
    }, (commit) => {
        let commitBox = document.getElementById(COMMITBOX_ID);
        if (commitBox) { //SubmitChange
            // Populate the pop up window, and make it readable only
            document.getElementById(COMMITBOX_ID).value = commit;
            document.getElementById(COMMITBOX_ID).readOnly = true;
        } else { //SignReview
            callback(commit);
        }
    });
}


// Create a sign commit object
function createSignedCommit(commitInfo, callback) {
    let commit = formCommit(commitInfo);
    // Sing the commit and then form signed commit
    signContent(commit, (result) => {

        // Take the commit signature
        // Since the commitMessage itself has signature
        // We take the last signature as the commit signature
        // This approach should work, but FIXME: make sure about it 
        var signature = isolateSignature(result);

        //Form signed commit
        callback(formSignedCommit(commit, signature));
    });
}


// Form the commit
function formCommit(commit) {

    let headers = '';

    //First commit has no parent
    let parents;
    if (commit.parents)
        parents = commit.parents;
    else
        parents = [];

    if (commit.tree) {
        headers += `tree ${commit.tree}\n`
    } else { // null tree
        headers += `tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\n`
    }

    //Check if commit has parent
    if (parents && parents.length) {
        for (let p of parents) {
            headers += 'parent'
            headers += ' ' + p + '\n'
        }
    }

    let author = commit.author
    headers += `author ${author.name} <${author.email}> ${
		author.timestamp
		} ${formatTimezoneOffset(author.timezoneOffset)}\n`

    //Check if committer is specified
    //They are the same in UI commits
    let committer = author;
    if (commit.commiter)
        committer = commit.commiter;

    headers += `committer ${committer.name} <${committer.email}> ${
		committer.timestamp
		} ${formatTimezoneOffset(committer.timezoneOffset)}\n`

    return `${headers}\n${normalize(commit.message)}`
}


// Form signed commit
function formSignedCommit(commit, signature) {

    let headers = comHeader(commit);
    let message = comMessage(commit);

    signature = normalize(signature);
    let signedCommit = `${headers}\n${PGP_SIG}${indent(signature)}\n${message}`;

    return signedCommit
}


// Extract the commit's signature
function isolateSignature(commit) {

    // Take the last signature as the commit signature
    // TODO: Make sure it does not go wrong
    let signature = commit.slice(
        commit.lastIndexOf(`${PGP_START}`),
        commit.lastIndexOf(`${PGP_END}`) +
        `${PGP_END}`.length
    )

    return outdent(signature)
}
