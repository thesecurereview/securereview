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
        //TODO: Take the right action based on the result
        parseMSGResponse({
            method: "POST",
            result
        });
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
//console.log(result)
        let project = result.project;
        let branch = result.branch;
        let change_id = result.change_id;
        let changeNumber = result._number;

        // Get the latest commit in the change branch
        getRevisionCommit(change_id, "current", (commitInfo) => {

            // Get base commit in the base branch
            //let parents = extractParents(commitInfo);
            //let oldHead = commitInfo.parents[0].commit;
            let oldHead = commitInfo.commit;

            // Get the original commit message		
            let commitMessage = commitInfo.message;

            // Extract the review info
            let review = captureReview();

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

                // Get the tree hash
                getTreeContent({
                    project,
                    commitID: oldHead,
                    dir: ""
                }, (data) => {
                    //Prepare the new commit: Amending the pending branch
                    prepareCommit({
                        parents: [oldHead],
                        treeHash: data.id,
                        commitMessage: result
                    }, (commit) => {
                        // Create the new commit (amend review to commit message)
                        let type = "commit";
                        let obj = createGitObject(type, commit);
                        let objects = [];
			objects.push([type, obj.object]);

			/*
			* To upload a patch set, clients must amend the tip of the pending branch as follows[1,2]:
			* 	git commit --amend
			* 	git push origin HEAD:refs/for/master
			* The commit must be pushed to a ref in the refs/for/<target-branch> namespace
			* The magic refs/for/ prefix allows Gerrit to differentiate commits that are pushed for review
			* from commits that are pushed directly into the repository, bypassing code review.
			*
			* For an existing review to match, the following properties have to match [3]:
			* 	Change-Id, Repository name, Branch name
			* If a commit that has a Change-Id in its commit message is pushed for review,
			* Gerrit checks if a change with this Change-Id already exists for this project and target branch,
			* if yes, Gerrit creates a new patch set for this change. If not, a new change with the given Change-Id is created.
			* If a commit without Change-Id is pushed for review, Gerrit creates a new change and generates a Change-Id for it.
			* Amending/rebasing a commit preserves the Change-Id so that the new commit automatically
			* becomes a new patch set of the existing change.
			*
			* From implementation point of view, we can replicate "git amend" by
			* 	Deleting the previous head (push origin master --delete )
			*	Pointing to the new pushed commit
			* equiv.
			* 	Reset to HEAD^
			*	Push the new one
			*
			* [1] https://gerrit-review.googlesource.com/Documentation/intro-user.html#upload-patch-set
			* [2] https://gerrit-review.googlesource.com/Documentation/intro-user.html#upload-change
			* [3] https://gerrit-documentation.storage.googleapis.com/Documentation/2.14.7/user-changeid.html
			*/

                        // Push the commit to the server
		    	pushObjects({
			    auth,
			    branch,
			    oldHead,
			    newHead: obj.id,
			    ref: `refs/for/${branch}`,
			    repo_url: `${HOST_ADDR}/${project}`,
			    objects
			},
			(result) => {
			    //TODO: Prase the response and take action
			    //parseSendPackResult (result)
			    console.log(result);
			});
                    });
                });

                /*/ Update the commit message of change branch using API
                amendChangeBranch({
                    change_id,
                    review,
                    commitMessage: result
                });*/
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
