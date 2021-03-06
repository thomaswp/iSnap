
// A list of assignments that users can select from when using Snap
// The assignmentID will be logged with each statement
// 'test' and 'view' will not show up on the selection menu
window.assignments = {
    'none': {
        name: 'None',
        hint: 'just using Snap',
    },
    'lightsCameraActionHW': {
        name: 'Lights, Camera, Action!',
        hint: 'Homework 1',
    },
    'squiralHW': {
        name: 'Squiral',
        hint: 'In Lab 2 Activity',
        hints: true,
        dataset: 'template',
    },
    'polygonMakerLab': {
        name: 'Polygon Maker',
        hint: 'Homework 2',
        hints: true,
        dataset: 'template',
    },
    'pong1Lab': {
        name: 'Pong - 1 Player',
        hint: 'In Lab 3 Activity',
        hints: true,
        dataset: 'template',
    },
    'pong2HW': {
        name: 'Pong - 2 Players',
        hint: 'Homework 3',
        hints: true,
        prequel: 'pong1Lab',
        dataset: 'template',
    },
    'guess1Lab': {
        name: 'Guessing Game Part 1',
        hint: 'In Lab 4 Activity',
        hints: true,
        dataset: 'template',
    },
    'guess2Lab': {
        name: 'Guessing Game Part 2',
        hint: 'In Lab 5 Activity',
        hints: true,
        prequel: 'guess1Lab',
        dataset: 'template',
    },
    'project': {
        name: 'SNAP Project',
        hint: 'Project Deliverable 1',
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
window.requireAssignment = true;
// Allows the user to change their assignment by clicking on project title
window.allowChangeAssignment = true;

// If true, users are required to login before they can use the system
window.requireLogin = true;

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
        return new window.DBLogger(3000);
    }
};

// If this function returns true, Snap will not confirm before
// you leave the page. This is handy for debugging.
window.easyReload = function(assignmentID) {
    return (assignmentID == 'test' || assignmentID == 'view');
};
