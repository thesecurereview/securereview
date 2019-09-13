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
    }, function(commit) {

        // Create final Git commit object
        var type = "commit";
        var obj = createGitObject(type, commit);
        objects.push([type, obj.object]);

        // Form the repo URL
        var repo_url = HOST_ADDR + "/" + project
        // Push the commit to the server
        pushObjects({
                repo_url,
                auth,
                branch,
                oldHead: parents[0],
                newHead: obj.id,
                objects
            },
            function(result) {
                //TODO: Prase the response and take action
                //parseSendPackResult (result)
                callback({
                    result
                });
            });
    });
}
