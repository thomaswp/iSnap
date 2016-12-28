// hints.js
// Contacts the a server for Hint and provides them to the user
// Configure in hints/config.js

require('../logging/main');
require('config');
require('debug-display');
require('highlight-display');
require('snap-display');
require('gui-extensions');

if (window.getHintProvider && window.assignmentID) {
    window.hintProvider = window.getHintProvider();
}