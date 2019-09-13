//  Run the merge process 
var runMergeProcess = async function(change_id, project, parents, callback) {

    /* Merge algorithm:
     * - Differentiate blobs
     * - Get trees for both branches
     * - Create the new merge commit
     * - Create the packfile including 
     * 	new trees/modified,added blobs/head of change branch
     */
    var t0 = performance.now();

    let changeHead = parents.changeHead
    // Get the status of changed files in the change branch
    getRevisionFiles(change_id, changeHead, function(result) {

        // Differentiate files between change and base branches
        var [added_files, deleted_files, modified_files] =
        differentiate_blobs(result);

        // Find involved trees/subtrees in the merge
        var paths = added_files.concat(deleted_files, modified_files);
        var changed_dirs = getCommonDirs(paths);

	// Form tree urls that need to be fetched
	//TODO: Add lablels to dirs to prevent trying to
	// fetch a tree which does not exist
	let urls = formTreeUrls(project, parents, changed_dirs);

	// Fetch tree contents for PR and base branch
	multiFetch({
		urls,
		parser: treeParser
	}, ({
		data
	}) => {

                let btrees = formTreeEntries(data[parents.targetHead]);
                let ptrees = formTreeEntries(data[parents.changeHead]);


		console.log(btrees, ptrees)

            /*/ Get urls for needed blobs (added, modified)
            let urls = formBlobUrls(project, parents,
                added_files, modified_files);

            var t1 = performance.now();
            console.log("Taken time for tree reconstruction: ", t1 - t0)

            // Fetch all needed blobs
            multiFetch({
                urls,
                parser: blobParser
            }, ({
                data
            }) => {
                //TODO:Merge modified blobs in advance

                // Update the bottom tree
                let {
                    master_trees,
                    newdirs,
                    newObjects
                } = mergeBottomTree({
                    parents,
                    blobs: data,
                    added_files,
                    deleted_files,
                    modified_files,
                    master_trees: mtrees,
                    pr_trees: ptrees
                });

                // Remove newdirs before starting propagateUpdate process
                // as they are already added during mergeBottomTree process
                changed_dirs = arrayDifference(changed_dirs, newdirs);

                // Propagate the update to get new root tree hash
                let {
                    treeHash,
                    newTreeObjects
                } = propagateUpdate({
                    changed_dirs,
                    master_trees
                });

                //New blob/tree objects will appear in the packfile
                newObjects = [...newObjects, ...newTreeObjects];

                callback(treeHash, newObjects);
            });*/
        });
    });
}
