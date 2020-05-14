/*
- pop up a window to get the review information from the reviewer (score and comments)
- fetch the head of the change branch (downloading a packfile from server)
- extract the commit message and tree hash from head of the change branch (decompress the packfile)
- form a new commit message to embed review information
- create a new commit object (using the new commit message)
- push the new commit object to the server.
*/
var url;

// From a review unit to store the reviews
function signReviewUnit({
    review,
    commitMessage
}, callback) {
    // Embed review in the original commit message
    let reviewUnit = formReviewUnit(change_id, review);

    // Sign review
    signContent(authUsername, reviewUnit, function(result) {
        // Embed signed reviewUnit in the commitMessage
        commitMessage = embedReviewUnit(
            change_id, commitMessage, result);

        callback(commitMessage);
    });
}


// Perform the signing review
function run() {

    // Get the review
    let review = captureReview();

    // Do the config per PR 
    preConfig(url, (urlInfo) => {

        //Get the summary of PR
        getPRSummary({prId: urlInfo.prId}, (prInfo) =>{
            console.log(prInfo)
            // Check if pr is created in a fork repo 
            let prRepo = prInfo.head.repo
            prRepo = prRepo ? prRepo.name : urlInfo.repo 
            let prBranch = prInfo.head.ref
            let prHead = prInfo.head.sha
            let prUser = prInfo.head.user.login


            //Get PR head commit
            getCommit({user:prUser, repo:prRepo, commit:prHead}, (commit) => {
                //console.log(commit)
                let commitMessage = commit.commit.commitMessage
                let reviewUnit = embedReviewUnit (commitMessage, review)

                /*/ Store signed review in the PR branch
                signReviewUnit({
                    review,
                    commitMessage,
                }, (reviewUnit) => {

                })*/

                //Prepare the new commit: Amending the pending branch
                prepareCommit({
                    parents: [prHead],
                    treeHash: commit.commit.tree.sha,
                    commitMessage: reviewUnit
                }, (commit) => {
                    // Create the new commit (amend review to commit message)
                    let type = TYPE_COMMIT;
                    let obj = createGitObject(type, commit);
                    let objects = [];
                    objects.push([type, obj.object]);

                    pushObjects({
                        branch: prBranch,
                        oldHead: prHead,
                        newHead: obj.id,
                        repo_url: `${API_GH}/repos/${prUser}/${prRepo}`,
                        objects
                    },
                    (result) => {
                        //TODO: Prase the response and take action
                        //parseSendPackResult (result)
                        console.log(result);
                    });
                });

            })
        });
    });


}


document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, (tabs) => {
        url = tabs[0].url;
    });

    document.getElementById('publish_review').addEventListener(
        'click', run);

});
