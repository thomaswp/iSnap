// Logs things. Not a morphic.

var UserInfo;
var Logger;
var DBLogger;

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

function Logger(interval) {
    this.init(interval);
}

Logger.sessionID = newGuid();
Logger.prototype.serializer = new SnapSerializer();

Logger.prototype.init = function(interval) {
    this.queue = [];
    this.log("Logger.started");
    this.start(interval);
}

Logger.prototype.userInfo = function() {
    var browserID = null;
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

Logger.prototype.addCode = function(log) {
    if (typeof(ide) == 'undefined' || !ide.stage) return;
    log.projectID = ide.stage.guid;
    var code = this.serializer.serialize(ide.stage);
    if (code != this.lastCode) {
        log.code = code;
        this.lastCode = code;
    }
}

Logger.prototype.addXmlNewlines = function(xml) {
    // Add newlines at the end of each tag
    // TODO: there's probably a better regex way to do this
    xml = xml.replace(/(<[^<>]*>)/g, "$1\n");
    xml = xml.replace(/(.)(<[^<>]*>)/g, "$1\n$2");
    xml = xml.trim();
    return xml;
}

Logger.prototype.storeMessages = function(logs) {
    logs.forEach(function(log) {
        console.log(log);
    });
}

Logger.prototype.stop = function() {
    clearInterval(this.storeCallback);
}

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

function DiffLogger(interval) {
    Logger.call(this, interval);
}

DiffLogger.prototype = new Logger();

DiffLogger.prototype.codeDiff = function(a, b, addNewLines) {
    if (addNewLines) {
        a = this.addXmlNewlines(a);
        b = this.addXmlNewlines(b);
    }

    aArray = a.split("\n");
    bArray = b.split("\n");

    difference = diff(aArray, bArray);
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

function DBLogger(interval) {
    Logger.call(this, interval);
}

DBLogger.prototype = new Logger();

DBLogger.prototype.storeMessages = function(logs) {
    var data = {
        "userInfo": this.userInfo(),
        "logs": logs,
    };
    this.sendToServer(JSON.stringify(data), 0);
}

DBLogger.prototype.sendToServer = function(data, attempts) {
    if (attempts >= 3) {
        Trace.log("Log.failure");
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
}

var Trace = new DBLogger(3000);
