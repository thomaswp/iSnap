// Logs things. Not a morphic.

// The assignment the student is working on
var assignmentID;
var Trace;

// Helper functions

// Generates a random GUID to help us keep track of things across sessions
// Credit: http://stackoverflow.com/a/8809472/816458
function newGuid() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}

// Gets a map of the GET parameters in the URL
// Credit: http://stackoverflow.com/a/5448635/816458
function getSearchParameters() {
      var prmstr = window.location.search.substr(1);
      return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}

function transformToAssocArray( prmstr ) {
    var params = {};
    var prmarr = prmstr.split("&");
    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = tmparr[1];
    }
    return params;
}

// Get the assignment passed via GET parameter 
function checkAssignment() {
    assignmentID = getSearchParameters()['assignment'];
    
    if (!window.assignments || !window.requireAssignment) return;
    if (!window.assignments[assignmentID]) {
        // redirect if no assignment is listed
        window.location.replace("logging/assignment.html");
    } 
}

// Logger classes

function Logger(interval) {
    this.init(interval);
}

Logger.sessionID = newGuid();
Logger.prototype.serializer = new SnapSerializer();

Logger.prototype.init = function(interval) {
    this.queue = [];
    this.onCodeChanged = null;
    this.log("Logger.started");
    this.start(interval);
}

// Get user identifying user info and bundle it as an object
Logger.prototype.userInfo = function() {
    var browserID = null;
    // browser ID stored in cache or local storage
    if (typeof(Storage) !== "undefined" && localStorage) {
        browserID = localStorage.getItem("browserID");
        if (!browserID) {
            browserID = newGuid();
            localStorage.setItem("browserID", browserID);
        }
    }
    return {
        "sessionID": Logger.sessionID,
        "browserID": browserID,
        "assignmentID": assignmentID,
    };
}

Logger.prototype.flushSaveCode = function() {
    // If we have a pending saveCode function, run it and cancel the callback
    if (this.saveCode) {
        this.saveCode();
        if (this.saveCodeTimeout) {
            clearTimeout(this.saveCodeTimeout);
            this.saveCodeTimeout = null;
        }
    }
}

/**
 * Logs a message. Depending on the logger being used, the message
 * may be output to the console or sent to be stored in a database.
 * 
 * @this {Logger}
 * @param {string} message The message to be logged. This is usually
 * of the form "[Class].[action]", e.g. "Logger.started", "IDE.selectSprite"
 * or "Block.snapped"
 * @param {object} data A javascript object to be logged in its entirety. Be
 * careful not to pass large objects here.
 * @param {boolean} saveImmediately If true, the code state will be saved
 * immediately. By default, the code is saved on the next frame, allowing
 * logging calls to capture code changes that occur immediately the logging
 * statement. For example, this allows a logging statement to come at the
 * beginning of a method which alters the code, and have that state change
 * still captured.
 */
Logger.prototype.log = function(message, data, saveImmediately) {
    if (!(message || data)) return;

    this.flushSaveCode();

    var log = {
        "message": message,
        "data": data,
        "time": Date.now(),
    };

    // Set a callback to save the code state in 1ms
    // This allows us to call log() at the beginning of a method
    // and save the code after it's finished executing
    // (or before the next log() call, per the code above)
    var myself = this;
    this.saveCode = function() {
        myself.saveCode = null;
        myself.addCode(log);
    }
    // If saveImmediately is true, we just run it now
    if (saveImmediately) {
        this.saveCode();
    } else {
        this.saveCodeTimeout = setTimeout(this.saveCode, 1);
    }

    this.queue.push(log);
}

Logger.prototype.logErrorMessage = function(error) {
    this.logError({
        "message": error 
    });
}

Logger.prototype.logError = function(error) {
    if (!error) return;
    console.error(error);
    this.log("Error", {
        "message": error.message,
        "url": error.fileName,
        "line": error.lineNumber,
        "column": error.columnNumber,
        "stack": error.stack,
        "browser": this.getBrowser(),
    });
}

// Credit: http://stackoverflow.com/a/9851769/816458
Logger.prototype.getBrowser = function() {
    try {
        if (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) return "Opera";
        // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
        if (typeof InstallTrigger !== 'undefined') return "Firefox";
        if (Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0) return "Safari";
            // At least Safari 3+: "[object HTMLElementConstructor]"
        if (!!window.chrome) return "Chrome";              // Chrome 1+
        if (/*@cc_on!@*/false || !!document.documentMode) return "IE"; // At least IE6
    } catch (e) {
    }
    return null;
}

Logger.prototype.addCode = function(log) {
    if (typeof(ide) == 'undefined' || !ide.stage) return;
    log.projectID = ide.stage.guid;
    var code = this.serializer.serialize(ide.stage);
    code = this.removeImages(code);
    if (code != this.lastCode) {
        log.code = code;
        this.lastCode = code;
        if (this.onCodeChanged) this.onCodeChanged(code); 
    }
}

Logger.prototype.addXmlNewlines = function(xml) {
    // Add newlines at the end of each tag
    // TODO: there's probably a better regex way to do this
    if (!xml) return xml;
    xml = xml.replace(/(<[^<>]*>)/g, "$1\n");
    xml = xml.replace(/(.)(<[^<>]*>)/g, "$1\n$2");
    xml = xml.trim();
    return xml;
}

Logger.prototype.storeMessages = function(logs) {
    
}

/**
 * Stops the logger from posting messages.
 * Messages can still be logged and will post
 * when the logger is started.
 * 
 * @this {Logger}
 */
Logger.prototype.stop = function() {
    clearInterval(this.storeCallback);
}

/**
 * Starts the logger. Messages will be posted
 * at the provided interval.
 * 
 * @param {int} interval The interval at which to post
 * logged messages. 
 */
Logger.prototype.start = function(interval) {
    if (!interval) return;
    var myself = this;
    this.storeCallback = setInterval(function() {
        if (myself.queue.length == 0) return;
        myself.flushSaveCode();
        myself.storeMessages(myself.queue)
        myself.queue = [];
    }, interval);
}

Logger.prototype.removeImages = function(xml) {
    if (!xml) return xml;
    return xml.replace(/data:image\/png;base64[^<\"]*/g, "");
}



// The DiffLogger requires a reference to simplediff, not currently setup
// https://github.com/paulgb/simplediff
// It reduces output by only recordering the diff between two code states.
function DiffLogger(interval) {
    Logger.call(this, interval);
}

DiffLogger.prototype = Object.create(Logger.prototype);

DiffLogger.prototype.codeDiff = function(a, b, addNewLines) {
    if (addNewLines) {
        a = this.addXmlNewlines(a);
        b = this.addXmlNewlines(b);
    }

    var aArray = a.split("\n");
    var bArray = b.split("\n");

    var difference = window.diff(aArray, bArray);
    var out = [];
    var line = 0;
    for (var i = 0; i < difference.length; i++) {
        var op = difference[i][0];
        var values = difference[i][1];
        if (op === "+") {
            out.push([line, "+", values.join("\n")]);
            line += values.length;
        } else if (op == "-") {
            out.push([line, "-", values.length]);
        } else {
            line += values.length;
        }
    }
    return out;
}

DiffLogger.prototype.addCode = function(log) {
    Logger.prototype.addCode.call(this, log);
    if (!log.code) return;

    if (!this.lastCode || this.lastProject != log.projectID) this.lastCode = "";
    var code = this.addXmlNewlines(log.code);
    log.code = this.codeDiff(this.lastCode, code);

    this.lastCode = code;
    this.lastProject = log.projectID;
}


// DBLogger logs to a the logging/mysql.php page,
// which saves to a MySQL database. See more in 
// logging/README.md
function DBLogger(interval) {
    Logger.call(this, interval);
}

DBLogger.prototype = Object.create(Logger.prototype);

DBLogger.prototype.storeMessages = function(logs) {
    var data = {
        "userInfo": this.userInfo(),
        "logs": logs,
    };
    this.sendToServer(JSON.stringify(data), 0);
};

DBLogger.prototype.sendToServer = function(data, attempts) {
    if (attempts >= 3) {
        // Trace.log("Log.failure"); // creates a loop, probably not good
        return; // max retries if the logging fails
    }

    var xhr = new XMLHttpRequest();
    var myself = this;
    var retry = false;
    xhr.onreadystatechange = function() {
        if (xhr.status > 0 && xhr.status != 200 && !retry) {
            retry = true;
            setTimeout(function() {
                myself.sendToServer(data, attempts + 1);
            }, 1000);
        }
    };
    xhr.open("POST", "logging/mysql.php", true);
    xhr.send(data);
};

// Log to the console

ConsoleLogger.prototype = Object.create(Logger.prototype);

function ConsoleLogger(interval) {
    Logger.call(this, interval);
}

ConsoleLogger.prototype.storeMessages = function(logs) { 
    var myself = this;
    logs.forEach(function(log) {
        log.userInfo = myself.userInfo();
        console.log(log);
    });
};

// Setup
function setupLogging() {
    checkAssignment();

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
            "message": msg,
            "fileName": url,
            "lineNumber": line,
            "columnNumber": column,
            "stack": error ? error.stack : null,
        });
    };
}

setupLogging();
