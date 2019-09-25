/**
 * Submit merge request:
 *  - compare target and change branches
 *  - update the bottom tree in the target branch
 *  - propagate the update to the root tree
 *  - computet the root tree hash and then new commit
 */
function run(url) {

    // Get change number
    var cn = getChangeNumber(url)
    // Get a summary of change
    getChangeSummary(cn, (result) => {
        var project = result.project
        var branch = result.branch
        var change_id = result.change_id
        //var changeNumber = result._number

        //TODO: sync the following API calls
        // Get info: change branch
        getRevisionReview(change_id, "current", (changeInfo) => {

            //Get the number of patches in the change branch
            revisions = getObjetValues(changeInfo.revisions)[0]._number;

            //Get commits in the change branch
            let urls = formRevisionUrls(change_id, revisions);

            multiFetch({
                urls,
                parser: revisionParser
            }, ({
                data
            }) => {

                //Commit objects in change branch should be as part of the packfile
                let commitObjects = createRevisionCommits(getObjetValues(data));

                // Get info about the target branch
                getBranchInfo(project, branch, (targetInfo) => {

                    // Populate the parent window
                    setParentInfo(targetInfo);

                    // Form parents, Common ancestor is parent of the 1st revision
                    let {
                        parents
                    } = formParents(changeInfo, data[1], targetInfo);

                    // Run the merge process
                    runMergeProcess(change_id, project, parents,
                        (treeHash, objects) => {
                            //new objects
                            objects = [...objects, ...commitObjects]
                            //remove ca from parents
                            parents = [parents.targetHead, parents.changeHead]

                            //TODO: Form a better commit message 
                            var commitMessage = `Merge change ${cn}\n\nChange-Id: ${change_id}`
                            /*pushCommit({ 
                            	url, 
                            	project, 
                            	branch,
                            	objects, 
                            	parents, 
                            	treeHash, 
                            	commitMessage}, 
                            ({ result }) => {
                            	var t1 = performance.now();
                            	console.log(result)
                            });*/
                        });
                });

            });

        });

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
