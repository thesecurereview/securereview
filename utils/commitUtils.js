// Extract parents from a commit object
function extractParents (commitInfo){

	var parents = [];
	for (p in commitInfo.parents){
		parents.push(commitInfo.parents[p].commit)
	}

	return parents
}


// Populate the popup window with parent info
function setParentInfo(commit) {
	
	var parent_info = '';

	parent_info += `author: ${commit.author.name} <${commit.author.email}> \n`
	parent_info += `committer: ${commit.committer.name} <${commit.committer.email}> \n`
	//parent_info += `date: ${get_standard_time(commit.author.date)}\n`
	parent_info += `date: ${commit.author.date}\n`
	parent_info += `message: ${commit.message}\n`

	/*fill the parent info form*/
	document.getElementById('parent_info').value = parent_info;
}


// Create a revision commit
function createRevisionCommits(revisions){
	let objects = [];
	let type = "commit";

	for (commit of revisions){
		//update parents format
		commit.parents = formParentRevisions(commit.parents);

		//update time format TODO: update the key name
		let ts = commit.author.date;
		let tz = commit.author.tz;
		commit["author"]["timestamp"] = 
			formDate({input:ts + formatTimezoneOffset(tz)});
		commit["author"]["timezoneOffset"] = negateExceptForZero(tz);

		ts = commit.committer.date;
		tz = commit.committer.tz;
		commit["committer"]["timestamp"] = 
			formDate({input:ts + formatTimezoneOffset(tz)});
		commit["committer"]["timezoneOffset"] = negateExceptForZero(tz);

		//Create Git commit object
		let obj = createGitObject(type, formCommit(commit));
		objects.push([type, obj.object]);
	}

	return objects;
}
