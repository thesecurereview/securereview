/**
 * Create a review unit:
 *	<review score>
 *	<reviewer’s comments>
 *	<reviewer's name> <reviewer's e-mail> <timestamp> if commit is not signed
 */

// Extract the review information: comments, score
function captureReview() {
    let comments = document.getElementById('comments').value;
    //let score = document.querySelector('input[name = "Code-Review"]:checked').value;
    let score = document.querySelector('input[name = "pull_request_review"]:checked').value;

    return {
        comments,
        score
    };
}

// From a signed review unit to store the reviews
function signReviewUnit({
    preSignature,
    reviewInfo
}, callback) {
    // Embed review in the original commit message
    let reviewUnit = `${preSignature}\n${reviewInfo}`;

    // Sign review
    signContent(reviewUnit, (result)=> {
        callback(result);
    });
}

//Embed the signed review in the commitMessage
function formCommitMessage(orgCommitMsg, reviewInfo, reviewSignature) {
    return `${orgCommitMsg}${reviewInfo}\n${reviewSignature}`
}


function getOriginalCommitMessage(commitMessage){
	let prefix = "Review-Score:"
	return commitMessage.slice(
		0, commitMessage.lastIndexOf(prefix) -1
    		)
}


function extractReviewUnit(commitMessage){
	//FIXME Make sure the slice is correct
	
	//Check if there is a review unit
	let prefix = "Review-Score:"
	if (commitMessage.indexOf(prefix) == -1)
	    return {
		review:""
	}

    let reviewInfo = commitMessage.slice(
	commitMessage.lastIndexOf(prefix),
        commitMessage.lastIndexOf(`${PGP_START}`)
    )

    let signature = commitMessage.slice(
        commitMessage.lastIndexOf(`${PGP_START}`),
        commitMessage.lastIndexOf(`${PGP_END}`) +
        `${PGP_END}`.length
    )
    return {
	reviewInfo,
	signature: outdent(signature)
	}
}

function isFirstReviewUnit(reviewUnit){
	if (reviewUnit.review == "") return true
	return false	
}


function integrateReviewUnits(reviewUnits, option){
	return "Test Message"
}

