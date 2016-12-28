
// Helper functions

/* exported newGuid checkAssignment createCORSRequest */

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

// Helper Functions

// credit: http://www.html5rocks.com/en/tutorials/cors/
function createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    if ('withCredentials' in xhr) {
        // Check if the XMLHttpRequest object has a "withCredentials" property.
        // "withCredentials" only exists on XMLHTTPRequest2 objects.
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != 'undefined') {
        // Otherwise, check if XDomainRequest.
        // XDomainRequest only exists in IE, and is IE's way of making CORS
        // requests
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        // Otherwise, CORS is not supported by the browser.
        xhr = null;
    }
    return xhr;
}

// credit: http://stackoverflow.com/a/4673436
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number] : match;
        });
    };
}