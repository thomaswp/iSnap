
// A list of assignments that users can select from when using Snap
// The assignmentID will be logged with each statement
// 'test' and 'view' will not show up on the selection menu
window.assignments = {
    'none': {
        name: 'None',
        hint: 'just using Snap',
    },
    'test': {
        name: 'Testing',
    },
    'view': {
        name: 'Viewing',
    },
};

// If true, requires the Snap users to select an assignment before
// proceeding. Assignments can be pre-specified by using the url
// snap.html?assignment=id
window.requireAssignment = false;
// Allows the user to change their assignment by clicking on project title
window.allowChangeAssignment = false;

// If true, users are required to login before they can use the system
window.requireLogin = false;

// Specify to override the default Snap cloud URL
// window.snapCloudURL = 'https://snap.apps.miosoft.com/SnapCloud';

// Specify the login header's logo and title text
window.loginHeader = {
    logo: 'login/NCStateLogoWhite.png',
    description: 'CSC 200 | Introduction To Computers and Their Uses'
};

// Create the logger you want to use on this snap deployment
window.createLogger = function(assignmentID) {
    if (assignmentID == 'view') {
        // Logs to the console
        return new window.ConsoleLogger(50);
    } else {
        // Logs to a MySQL database
        // return new window.Logger(50);
        return new window.ConsoleLogger(50);
        // return new window.DBLogger(3000);
    }
};

// If this function returns true, Snap will not confirm before
// you leave the page. This is handy for debugging.
window.easyReload = function(assignmentID) {
    // return (assignmentID == 'test' || assignmentID == 'view');
    return true;
};
