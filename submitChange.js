// TODO: Remove global variables
// Cache objects and commitInfo temporarily
var finalObjects = [];
var commitInfo;

/**
 * Submit merge request:
 *  - compare target and change branches
 *  - update the bottom tree in the target branch
 *  - propagate the update to the root tree
 *  - computet the root tree hash and then new commit
 */
function run(url) {

    // Do the config per PR 
    preConfig(url, (urlInfo) => {

        //Get the summary of PR
        let prId = urlInfo.prId;
        getPRSummary({prId}, (prInfo) =>{
            // Check if pr is created in a fork repo 
            let prRepo = prInfo.head.repo
            prRepo = prRepo ? prRepo.name : urlInfo.repo 
            let prBranch = prInfo.head.ref
            let prHead = prInfo.head.sha
            let prUser = prInfo.head.user.login

            getPRCommits({prId}, (prCommits) =>{
		// Last commit in prCommits is the head of the PR branch 
		//Start  from end
		prCommits.reverse()

                let reviewUnits = []
                //let commitMessages = {}
                for (commit of prCommits){
	               /* let commitId = commit.sha
	                let commitMessage = commit.commit.message
	                commitMessages[commitId] = commitMessage*/

			//Go to the first RU
			let reviewUnit = extractReviewUnit(commit.commit.message)
			if (isFirstReviewUnit(reviewUnit) === false){
				reviewUnits.push(reviewUnit)
				//break;
			}
			
		}

		//Validate the signatures
		validateReviewUnits(reviewUnit, result =>{
			//Integrate RUs using the option
			let integrateOption = "Full"; //"Compact"
			let commitMessage = integrateReviewUnits(reviewUnits, integrateOption)

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
			        repo_url: REPO_URL,
			        objects
			    },
			    (result) => {
			        //TODO: Prase the response and take action
			        //parseSendPackResult (result)
			        console.log(result);
			    });
		      });
		});
            });
        });
    });
}


function pushCommit() {

    // Create final Git commit object
    let commit = document.getElementById(COMMITBOX_ID).value;
    let type = "commit";
    let obj = createGitObject(type, commit);
    finalObjects.push([type, obj.object]);

    let parents = commitInfo.parents;
    let repo_url = `${HOST_ADDR}/${commitInfo.project}`;

    // Push the commit to the server
    pushObjects({
            auth,
            repo_url,
            branch: commitInfo.branch,
            oldHead: parents[0],
            newHead: obj.id,
            objects:finalObjects
        },
        (result) => {
            //TODO: Prase the response and take action
            //parseSendPackResult (result)
            console.log(result);
        });
}


// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({
            active: true,
            currentWindow: true
        },
        function(tabs) {
            url = tabs[0].url;
            run(url);
        });

    //Push the signed merge commit to the server
    document.getElementById('merge_change').addEventListener(
        'click', pushCommit);
});
