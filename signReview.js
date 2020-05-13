/*
- pop up a window to get the review information from the reviewer (score and comments)
- fetch the head of the change branch (downloading a packfile from server)
- extract the commit message and tree hash from head of the change branch (decompress the packfile)
- form a new commit message to embed review information
- create a new commit object (using the new commit message)
- push the new commit object to the server.
*/
var url;

// From a review unit to store the reviews
function signReviewUnit({
    review,
    commitMessage
}, callback) {
    // Embed review in the original commit message
    let reviewUnit = formReviewUnit(change_id, review);

    // Sign review
    signContent(authUsername, reviewUnit, function(result) {
        // Embed signed reviewUnit in the commitMessage
        commitMessage = embedReviewUnit(
            change_id, commitMessage, result);

        callback(commitMessage);
    });
}


// Perform the signing review
function run() {

    preConfig(url, (urlInfo) => {
        getPRSummary({prId: urlInfo.prId}, (prInfo) =>{
            console.log(prInfo)
        })
    });


}


document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, (tabs) => {
        url = tabs[0].url;
    });

    document.getElementById('publish_review').addEventListener(
        'click', run);

});
