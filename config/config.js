let AUTH;
let AUTHOR;
let REPO_API;
let REPO_URL;
let SERVER;


// Get the server type
function setServer(url) {
    if (url.startsWith(SERVER_GH)) {
        SERVER = SERVER_GH;
    } else if (url.startsWith(SERVER_GR)) {
        SERVER = SERVER_GR;
    } else {
        /*deactivate({
            rule: UNKNOWN_SERVER
        });*/
        return UNKNOWN_SERVER;
    }
    return SERVER;
}


// Check if the account info is available
function checkAccountInfo(callback) {
    let id = SERVER == SERVER_GH ? USER_GH : USER_GL;
    retrieveObject(id).then(
        (account) => {
            if (!account) {
                //TODO: check if the current user (from url) is added
                return errorHandler({
                    msg: `Account for the server \"${SERVER}\" is not set!`,
                    err: true
                });
            } else {
                callback(account);
            }
        });
}


// Get basic info about the request
function setConfig({
    account,
    urlInfo,
    server
}) {

    let {user, repo} = urlInfo
    //let caller = getUserInfo;
    if (server == SERVER_GH) {
        REPO_API = `${API_GH}/repos/${user}/${repo}`;
        REPO_URL = `${SERVER}/${user}/${repo}`;
    } else { //Gerrit
        //TODO: Fix this
        REPO_API = ``;
        REPO_URL = `${SERVER}`;
    }

    // TODO: Integrate AUTH and AUTHOR
    AUTH = account;

    AUTHOR = {
        name: account.username,
        email: `${account.username}@noreply.github.com`
    }
}


function preConfig(url, callback){

    // Check for proper hosting server
    let server = setServer(url);
    //if (server == UNKNOWN_SERVER) return;

    // Check for proper request
    let urlInfo = parseURL(url);
    //if (urlInfo == UNKNOWN_REQUEST) return;

    // Check for account info
    checkAccountInfo((account) => {
        // Set basic config
        setConfig({
            account,
            urlInfo,
            server
        })

        // Callback the basic info about the PR
        callback(urlInfo)

    });

}