// Logs things. Not a morphic.

require('config');
require('console-logger.js');
require('diff-logger.js');
require('db-logger.js');

var Trace;

// Setup
function setupLogging() {
    var assignmentID = checkAssignment();

    if (window.createLogger) {
        Trace = window.createLogger(assignmentID);
    } else {
        Trace = new Logger(50);
    }

    if (window.easyReload && window.easyReload(assignmentID)) {
        setTimeout(function() {
            window.onbeforeunload = null;
        }, 2000);
    }

    window.onerror = function(msg, url, line, column, error) {
        Trace.logError({
            'message': msg,
            'fileName': url,
            'lineNumber': line,
            'columnNumber': column,
            'stack': error ? error.stack : null,
        });
    };
}

setupLogging();
