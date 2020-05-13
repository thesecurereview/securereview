// Parse url to get the commit info
function parseURL(url) {

    /** URL pattern in GitHub:GitLab
     * new:	<SERVER>/<user>/<repo>/new/<branch>/<fpath>
     * edit:	<SERVER>/<user>/<repo>/edit/<branch>/<fpath>
     * delete:	<SERVER>/<user>/<repo>/delete:blob/<branch>/<fpath>
     * upload:	<SERVER>/<user>/<repo>/upload:tree/<branch>/<fpath> 
     * merge:	<SERVER>/<user>/<repo>/pull:merge_requests/<pr#>
     **/

    let info = url.replace(`${SERVER_GH}`, "").split("/");
    let prId = info[4];

    return {
        user: info[1],
        repo: info[2],
        prId
    }
}
