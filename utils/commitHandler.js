// Push commit to the server
function pushCommit({ project, changeNumber, branch, 
		objects, parents, treeHash, commitMessage }){

	console.log(objects)
	//Create a new signed 
	createSignedCommit({
		treeHash:treeHash,
		parents:parents,
		author:author,  
		commitMessage:commitMessage
	}, function (commit){

		// Create new signed commit
		var type = "commit";
		var obj = createGitObject(type, commit);
		objects.push([type, obj.object]);

		// Form the repo URL
		var repo_url = HOST_ADDR + "/" + project

		//push the commit to the server

		pushObjects({ repo_url, auth, branch, //changeNumber, 
			oldHead:parents[0], newHead:obj.id, objects }, 
			function(result){ 
				console.log(result)
				//parseSendPackResult (result)
			}
		);

	});

}


// Get the tree hash of a commit object
function getTreeHash(project, heads, callback){

	//let refs = ["master", "refs/changes/43/43/3"]
	// Assume we have the parent, and want the head

	// Form the repo URL
	var repo_url = HOST_ADDR + "/" + project
	fetchObjects( {repo_url, heads}, ({ data }) => {
			// Parse the commit object
			var commit = data[heads[0]].content
			callback(parseCommitObject(commit).tree)
		}
	);
}

