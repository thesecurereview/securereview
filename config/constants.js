// GitHub
const GITHUB = "github";
const gerrit = "gerrit";
const SERVER_GH = `https://github.com`;
const SERVER_GR = `https://gerrit.com`; //TODO: make server configurable
const API_GH = `https://api.github.com`;
const API_GR = `https://gerrit.com/api/v4`;

const COMMITBOX_ID = "commitBox";

const EXTENSION_ID = "SafeReview";
const EMAIL_GH = `users.noreply.github.com`;
const EMAIL_GR = `users.noreply.gerrit.com`;
const PASS_GH = "github_pass";
const PASS_GR = "gerrit_pass";
const TOKEN_GH = "github_token";
const TOKEN_GR = "gerrit_token";
const USER_GH = "github_user";
const USER_GR = "gerrit_user";

const UNKNOWN_REQUEST = "unknown-request";
const UNKNOWN_SERVER = "unknown-server";

const MERGE_CONFLICT = "merge-conflict";
const MERGE_CLOSED = "merge-closed";
const MERGE_GH = "pull";
const MERGE_GR = "merge_requests";

const MODE_BLOB = "100644";
const MODE_TREE = "40000";
const NULL_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

const TYPE_BLOB = "blob";
const TYPE_COMMIT = "commit";
const TYPE_TREE = "tree";

const PGP_SIG = "gpgsig";
const PGP_START = "-----BEGIN PGP SIGNATURE-----";
const PGP_END = "-----END PGP SIGNATURE-----";

const RPACK = "git-receive-pack";
const UPACK = "git-upload-pack";

var FILEMODE = {
    "33188": "100644",
    "33261": "100755",
    "40960": "120000",
    "57344": "160000",
    "16384": "40000"
}

// TODO: Put a comprehensive regex in place 
const REGEX_EMAIL =
    /^[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;
//github user regex: https://github.com/shinnn/github-username-regex#user-content-githubusernameregex
var REGEX_USER_GH = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;
//gitlab user regex: https://github.com/gitlabhq/gitlabhq/blob/master/lib/gitlab/path_regex.rb#L130
var REGEX_USER_GL = /^[a-zA-Z0-9_\-]|[a-zA-Z0-9_]$/;