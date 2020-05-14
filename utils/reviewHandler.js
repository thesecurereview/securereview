/**
 * Create a review unit:
 *	<review score>
 *	<reviewer’s comments>
 *	<reviewer's name> <reviewer's e-mail> <timestamp> if commit is not signed
 */

 //Embed the signed review in the commitMessage
function embedReviewUnit(commitMessage, review) {
    return `${commitMessage}\nReview-Score: ${review.score}\n`
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
