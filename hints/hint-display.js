
// HintDisplay: outputs hitns to the console

function HintDisplay() { }

HintDisplay.prototype.showHint = function(hint) {
    // eslint-disable-next-line no-console
    console.log(hint.from + ' -> ' + hint.to);
};

HintDisplay.prototype.showError = function(error) {
    // eslint-disable-next-line no-console
    console.error(error);
};

HintDisplay.prototype.clear = function() {
    // eslint-disable-next-line no-console
    console.log('-----------------------------------------');
};

HintDisplay.prototype.finishedHints = function() {

};

HintDisplay.prototype.showLoggedHint = function(data) {

};