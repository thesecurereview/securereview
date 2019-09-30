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
    change_id,
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


// Update Gerrit UI to reflect user's actions
function setReview(change_id, head, data) {

    let endpoint = `changes/${change_id}/revisions/${head}/review`;
    post_endpoint({
        auth,
        data,
        method: "POST",
        endpoint: `${PUT_URL}/${endpoint}`,
        contentType: `application/json;charset=UTF-8`
    }, (result) => {
        /*/TODO: Take the right action based on the result
        parseMSGResponse({
            method: "PUT",
            result
        });*/
    });
}


// Amend the change branch to embed the signed unit review
function amendChangeBranch({
    change_id,
    review,
    commitMessage
}) {

    /**
     * NOTE: since we append the commit message,
     * we should be careful about the commit message size 
     * However, the length field of the commit message is size_t
     * https://github.com/git/git/blob/master/strbuf.h
     * which means the maximum length is an upper bound at
     * the maximum value of size_t on your platform of choice
     * Implementations in other language than C may have their own limitaitons
     * For example JGit has a ~5MB max size for the commit message
     */

    // Update the commit message
    let endpoint = `changes/${change_id}/edit:message`;
    post_endpoint({
        auth,
        data: commitMessage,
        method: "PUT",
        endpoint: `${PUT_URL}/${endpoint}`
    }, (result) => {
        /*/TODO: Take the right action based on the result
        parseMSGResponse({
            method: "PUT",
            result
        });*/

        // Publish the update
        let endpoint = `changes/${change_id}/edit:publish`;
        post_endpoint({
            auth,
            data: null,
            method: "POST",
            endpoint: `${PUT_URL}/${endpoint}`
        }, (result) => {
            /*/TODO: Take the right action based on the result
            parseMSGResponse({
                method: "POST",
                result
            });*/

            // Update the UI to display review
            review = formGerritReview(change_id, review);
            setReview(change_id, "current", review);
        });
    });
}


// Perform the signing review
function run() {

    // Get change number
    let cn = getChangeNumber(url)
    getChangeSummary(cn, function(result) {

        let project = result.project;
        let branch = result.branch;
        let change_id = result.change_id;
        let changeNumber = result._number;

        // Get the latest commit in the change branch
        getRevisionCommit(change_id, "current", (commitInfo) => {
            //let targetBranch = result.branch

            // Get base commit in the base branch
            //let parents = extractParents(commitInfo);

            //let oldHead = commitInfo.commit;
            let parents = [];
            parents.push(commitInfo.commit)

            // Extract the review info
            let review = captureReview();

            let commitMessage = commitInfo.message;

            // Store signed review in the change branch
            signReviewUnit({
                change_id,
                review,
                commitMessage,
            }, (result) => {
                /**
                * How to update the change branch:
                * Approach1: 
		*	- Update the change branch by pushing a new signed commit
                * 	- Create a new patch set to embed signed reviews in the commit message
                * Approach2:
		*	- Update the commit message of change branch using API
		*/

		/*
                getTreeContent({
                    project,
                    commitID: parents[0],
                    dir: ""
                }, (data) => {console.log(data)

                    //Prepare the new commit
                    prepareCommit({
                        parents,
                        treeHash: data.id,
                        commitMessage
                    }, (commit) => {
                        console.log(commit);

                        // Create the new commit (amend review to commit message)
                        let objects = [];
                        let type = "commit";
                        let obj = createGitObject(type, commit);
                        objects.push([type, obj.object]);

                        let repo_url = `${HOST_ADDR}/${project}`;
                        // Push the commit to the server
		    	pushObjects({
			    auth,
			    repo_url,
			    branch,
			    oldHead: parents[0],
			    newHead: obj.id,
			    objects
			},
			(result) => {
			    //TODO: Prase the response and take action
			    //parseSendPackResult (result)
			    console.log(result);
			});

                    });

                });
		*/

                // Update the commit message of change branch using API
                amendChangeBranch({
                    change_id,
                    review,
                    commitMessage: result
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
