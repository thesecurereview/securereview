// Push commit to the server
function pushCommit({ url, project, branch, 
		objects, parents, treeHash, commitMessage} , callback){

	// Create a new signed commit
	createSignedCommit({
		treeHash:treeHash,
		parents:parents,
		author:author,  
		commitMessage:commitMessage
	}, function (commit){
		// Create the new commit object
		var type = "commit";
		var obj = createGitObject(type, commit);
		objects.push([type, obj.object]);

		// Form the repo URL
		var repo_url = HOST_ADDR + "/" + project

		// Push the commit to the server
		pushObjects({ repo_url, auth, branch,  
			oldHead:parents[0], newHead:obj.id, objects }, 
			function(result){ 
				//TODO: Prase the response and take action
				//parseSendPackResult (result)
				callback({ result })
			}
		);

	});

}
