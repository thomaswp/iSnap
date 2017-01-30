require('logger');

// DBLogger logs to a the logging/mysql.php page,
// which saves to a MySQL database. See more in
// logging/README.md
function DBLogger(interval) {
    Logger.call(this, interval);
}

DBLogger.prototype = Object.create(Logger.prototype);

DBLogger.prototype.storeMessages = function(logs) {
    var data = {
        'userInfo': this.userInfo(),
        'logs': logs,
    };
    this.sendToServer(JSON.stringify(data), 0);
};

DBLogger.prototype.sendToServer = function(data, attempts) {
    if (attempts >= 3) {
        // Trace.log('Log.failure'); // creates a loop, probably not good
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
    xhr.open('POST', 'logging/mysql.php', true);
    xhr.send(data);
};