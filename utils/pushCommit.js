// Push commit to the server
function pushCommit({
        url,
        project,
        branch,
        objects,
        parents,
        treeHash,
        commitMessage
    },
    callback
) {

    //Generate timestamp at the client side
    let [timestamp, timezoneOffset] = determineTime()
    author["timestamp"] = timestamp;
    author["timezoneOffset"] = timezoneOffset;

    // Create a new signed commit
    createSignedCommit({
        tree: treeHash,
        parents,
        author,
        message: commitMessage
    }, (commit) => {

        // Create final Git commit object
        var type = "commit";
        var obj = createGitObject(type, commit);
        objects.push([type, obj.object]);

        // Push the commit to the server
        var repo_url = `${HOST_ADDR}/${project}`;
        pushObjects({
                repo_url,
                auth,
                branch,
                oldHead: parents[0],
                newHead: obj.id,
                objects
            },
            (result) => {
                //TODO: Prase the response and take action
                //parseSendPackResult (result)
                callback({
                    result
                });
            });
    });
}
