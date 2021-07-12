/**
 * Create a review unit:
 *	<review score>
 *	<reviewer’s comments>
 *	<reviewer's name> <reviewer's e-mail> <timestamp> if commit is not signed
 */

 //Embed the signed review in the commitMessage
function embedReviewUnit(commitMessage, reviewUnit, reviewer) {
    return `${commitMessage}\nReview-Score: ${reviewUnit}\n${
		reviewer.name} <${reviewer.email}>`
}


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
    review,
    reviewer,
    preSignature
}, callback) {
    // Embed review in the original commit message
    let reviewUnit = `${preSignature}\nReview-Score: ${review.score}\n${
		reviewer.name} <${reviewer.email}>`;

    // Sign review
    signContent(reviewUnit, function(result) {
        callback(result);
    });
}

// Extract the commit's signature
function isolateReviewUnitInfo(commit) {

    // Take the last signature as the commit signature
    // TODO: Make sure it does not go wrong
    let signature = commit.slice(
        commit.lastIndexOf(`${PGP_START}`),
        commit.lastIndexOf(`${PGP_END}`) +
        `${PGP_END}`.length
    )

    return outdent(signature)
}
