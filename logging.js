// Logs things. Not a morphic.

var UserInfo;
var Logger;
var DBLogger;

UserInfo = {};
UserInfo.name = "Thomas";
UserInfo.assignment = "Project 1";

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}

function Logger(interval) {
    this.queue = [];
    this.start(interval);
}

Logger.prototype.log = function(message, data) {
    if (!(message || data)) return;
    var log = {
        "message": message,
        "data": data,
        "time": Date.now(),
    };
    this.queue.push(log);
}

Logger.prototype.storeMessages = function(logs) {
    logs.forEach(function(log) {
        console.log(log)
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
        myself.storeMessages(myself.queue)
        myself.queue = []; // TODO: delete on successful log, not immediately
    }, interval);
}

function DBLogger(interval) {
    Logger.call(this, interval);
}

DBLogger.prototype = new Logger();

DBLogger.prototype.storeMessages = function(logs) {
    var data = {
        "userInfo": UserInfo,
        "logs": logs,
    };
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "log_mysql.php", true);
    xhr.send(JSON.stringify(data));
    this.queue = [];
}

var Trace = new Logger(3000);
