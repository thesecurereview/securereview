
/*
* Extract the review information: comments, score
*/
function captureReview(){

	var comments = document.getElementById('comments').value;
	var score = document.querySelector(
		'input[name = "Code-Review"]:checked').value;

	return {comments:comments, 
		score:score};
}


/**
* Create a review unit as follows
	<change_id>
	<review score>
	<reviewer’s comments>
	<reviewer's name> <reviewer's e-mail> <timestamp>
*/
function formReviewUnit (change_id, review){

	var timestamp, timezoneOffset;
	[timestamp, timezoneOffset] = determineTime()		

	let reviewUnit = ''
	reviewUnit += `changeId ${change_id}\n`
	reviewUnit += `score ${review.score}\n`
	// TODO: Disscus it to make sure if ok to have no comments
	//reviewUnit += `comments ${normalizeText(review.comments)}\n`
	reviewUnit += `reviewer ${authUsername} <${authEmail}> ${timestamp} ${
				formatTimezoneOffset(timezoneOffset)}\n`
	
	return reviewUnit
}



/**
* Embed the signed review in the commitMessage
*/
function embedReviewUnit(change_id, commitMessage, reviewUnit){

	//TODO find a better approach
	// - Replace the Change-Id with Signed Review
	// - Add the change id

	var cidKey = "Change-Id:"
	var idx = commitMessage.lastIndexOf(cidKey);	
	var lasLine = commitMessage.substring(idx, idx+52);

	// Remove the last two lines
	commitMessage = commitMessage.substring(0, idx-1);

	// - Amend the commit message with reviewUnit
	// - Add the change_id  
	return commitMessage + `${reviewUnit}\n${lasLine}\n`
}



/**
* form a review in the expected format by Gerrit
*/
function formGerritReview(change_id, reviewData){

	/*var review = new FormData();
	review.append("message", review.comments)
	review.append("labels", {"Code-Review": review.score})
	*/

	var review = {
		/*"comments": {
		"f1": [
			{
			  "line": 1,
			  "message": "[nit] trailing whitespace"
			},
			{
			  "range": {
			    "start_line": 50,
			    "start_character": 0,
			    "end_line": 55,
			    "end_character": 20
			  },
			  "message": "Incorrect indentation"
			}
		]
		},*/
		"message": reviewData.comments,
		"labels": {
			"Code-Review": reviewData.score
		}
	}

	return JSON.stringify(review)

}
