
// Helper functions

/* exported newGuid createCORSRequest extend extendObject getSearchParameters
 * getCookie onWorldLoaded instanceOfAny
*/

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

// Credit: http://www.w3schools.com/js/js_cookies.asp
function getCookie(cname) {
    var name = cname + '=';
    var cookie = decodeURIComponent(document.cookie);
    var ca = cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return null;
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

function extend(clazz, functionName, newFunction) {
    if (!clazz || !clazz.prototype) {
        // eslint-disable-next-line no-console
        console.error('extend requires a class for its first argument');
        return;
    }
    return extendObject(clazz.prototype, functionName, newFunction);
}

// Called when the Snap world is loaded. No-op allows for extension
function onWorldLoaded() {

}

function extendObject(object, functionName, newFunction) {
    if (!object[functionName]) {
        // eslint-disable-next-line no-console
        console.trace();
        // eslint-disable-next-line no-console
        console.error('Cannot extend function ' + functionName +
            ' because it does not exist.');
        return;
    }

    var oldFunction = object[functionName];

    if (!oldFunction.extended && oldFunction.length != undefined &&
            oldFunction.length + 1 !== newFunction.length) {
        var message = 'Extending function with wrong number of arguments: ' +
            functionName + ' ' +
            oldFunction.length + ' vs ' + newFunction.length;
        if (window.Trace) {
            Trace.logErrorMessage(message);
        } else {
            // eslint-disable-next-line no-console
            console.error(message);
        }
    }

    object[functionName] = function() {
        var args = [].slice.call(arguments);
        args.unshift(oldFunction);
        return newFunction.apply(this, args);
    };
    object[functionName].extended = true;

    return oldFunction;
}

function instanceOfAny(object, types) {
    return types.some(function(type) {
        return object instanceof type;
    });
}

// Array.prototype.includes polyfill
// https://tc39.github.io/ecma262/#sec-array.prototype.includes
if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, 'includes', {
        value: function(searchElement, fromIndex) {

            // 1. Let O be ? ToObject(this value).
            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }

            var o = Object(this);

            // 2. Let len be ? ToLength(? Get(O, "length")).
            var len = o.length >>> 0;

            // 3. If len is 0, return false.
            if (len === 0) {
                return false;
            }

            // 4. Let n be ? ToInteger(fromIndex).
            //    (If fromIndex is undefined, this step produces the value 0.)
            var n = fromIndex | 0;

            // 5. If n ≥ 0, then
            //  a. Let k be n.
            // 6. Else n < 0,
            //  a. Let k be len + n.
            //  b. If k < 0, let k be 0.
            var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

            // 7. Repeat, while k < len
            while (k < len) {
                // a. Let elementK be the result of ? Get(O, ! ToString(k)).
                // b. If SameValueZero(searchElement, elementK) is true, return
                // true.
                // c. Increase k by 1.
                // NOTE: === provides the correct "SameValueZero" comparison
                // needed here.
                if (o[k] === searchElement) {
                    return true;
                }
                k++;
            }

            // 8. Return false
            return false;
        }
    });
}

// String.prototype.includes polyfill
if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
        'use strict';
        if (typeof start !== 'number') {
            start = 0;
        }

        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}
