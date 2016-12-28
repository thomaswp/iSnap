
// Helper functions

/* exported newGuid checkAssignment */

// Generates a random GUID to help us keep track of things across sessions
// Credit: http://stackoverflow.com/a/8809472/816458
function newGuid() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
        function(c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    return uuid;
}

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); };
}

// Gets a map of the GET parameters in the URL
// Credit: http://stackoverflow.com/a/5448635/816458
function getSearchParameters() {
    var prmstr = window.location.search.substr(1);
    return prmstr != null && prmstr != '' ? transformToAssocArray(prmstr) : { };
}

function transformToAssocArray( prmstr ) {
    var params = {};
    var prmarr = prmstr.split('&');
    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split('=');
        params[tmparr[0]] = tmparr[1];
    }
    return params;
}

// Get the assignment passed via GET parameter
function checkAssignment() {
    window.assignmentID = getSearchParameters()['assignment'];

    if (!window.assignments || !window.requireAssignment) return null;
    if (!window.assignments[assignmentID]) {
        // redirect if no assignment is listed
        window.location.replace('logging/assignment.html');
    }

    return window.assignmentID;
}

// eslint-disable-next-line no-unused-vars
function require() {
    // no-op: used for auto-generating <script> tags in the right order
}