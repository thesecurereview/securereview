/*
- pop up a window to get the review information from the reviewer (score and comments)
- fetch the head of the change branch (downloading a packfile from server)
- extract the commit message and tree hash from head of the change branch (decompress the packfile)
- form a new commit message to embed review information
- create a new commit object (using the new commit message)
- push the new commit object to the server.
*/
var url;

// Perform the signing review
function run() {
    // Get the review
    let review = captureReview();

    // Do the config per PR 
    preConfig(url, (urlInfo) => {

        //Get the summary of PR
        getPRSummary({prId: urlInfo.prId}, (prInfo) =>{
            //console.log(prInfo)
            // Check if pr is created in a fork repo 
            let prRepo = prInfo.head.repo
            prRepo = prRepo ? prRepo.name : urlInfo.repo 
            let prBranch = prInfo.head.ref
            let prHead = prInfo.head.sha
            let prUser = prInfo.head.user.login

            //Get PR head commit
            getCommit({commit:prHead}, (commit) => {
                //console.log(commit)
                let commitMessage = commit.commit.message
		let reviewer = {
			name : "Test",
			email: "test@example.com"
		}
		let preSignature = isolateSignature(commitMessage)
		let reviewInfo = `\nReview-Score: ${review.score}\n${
				reviewer.name} <${reviewer.email}>`

                // Store signed review in the PR branch FIXME: PreSignature
                signReviewUnit({
                    //preSignature,
                    reviewInfo
                }, (signedData) => {console.log(signedData)
			let reviewSignature = isolateSignature(signedData)
			let orgCommitMsg = getOriginalCommitMessage (commitMessage)
		        commitMessage = formCommitMessage (orgCommitMsg, reviewInfo, reviewSignature);console.log(commitMessage)
		        //Prepare the new commit: Amending the pending branch
		        prepareCommit({
		            parents: [prHead],
		            treeHash: commit.commit.tree.sha,
		            commitMessage
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
		                parseSendPackResult (result)
		                console.log(result);
		            });
		        });
                })

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
