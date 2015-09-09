<?php

include "config.php";

$mysqli = new mysqli($host, $user, $password, $db);
if ($mysqli->connect_errno) {
    die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
}

$log = '{"message":"IDE.opened","time":1441816773124,"projectID":"58b54515-ec78-40d9-b54f-2bb07ec39941","code":"<project name=\"Untitled\" app=\"Snap! 4.0, http://snap.berkeley.edu\" version=\"1\"><notes></notes><thumbnail>data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAAB4CAYAAAB1ovlvAAABkElEQVR4nO3XwYmDUBhG0dRiAYJtuBK0RJuyGmcXspgkm5lcMOfAv/8WFx7vdkLoVg/guwmQlABJCZCUAEkJkJQASQmQlABJCZCUAEkJkJQASQmQlABJCZCUAEkJkJQASQmQlABJCZCUAEkJkJQASQmQlABJCZCUAEkJkJQASQmQlABJCZCUAEkJkJQASQmQlABJCZCUAEkJkJQASQmQlABJCZCUAEkJkJQASQmQlABJCZCUAEkJkJQASQmQlACfGIbh3Pe9nnF5AnxhWZb7jeN4HsdRT7ocAb7xGOHjzfNcT7sEAb7xW3zrugrwjwjwhW3b7tFN0+QJ/gcCfMIn5DMESEqApARISoCkBEhKgKQESEqApARISoCkBEhKgKQESEqApARISoCkBEhKgKQESEqApARISoCkBEhKgKQESEqApARISoCkBEhKgKQESEqApARISoCkBEhKgKQESEqApARISoCkBEhKgKQESEqApARISoCkBEhKgKQESEqApARISoCkBEhKgKQESEqApARI6gfkoq9T11l4NAAAAABJRU5ErkJggg==</thumbnail><stage name=\"Stage\" guid=\"58b54515-ec78-40d9-b54f-2bb07ec39941\" width=\"480\" height=\"360\" costume=\"0\" tempo=\"60\" threadsafe=\"false\" lines=\"round\" codify=\"false\" scheduled=\"false\" id=\"1\"><pentrails>data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAeAAAAFoCAYAAACPNyggAAACtUlEQVR4nO3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+Bo3+AAF/RMkcAAAAAElFTkSuQmCC</pentrails><costumes><list id=\"2\"></list></costumes><sounds><list id=\"3\"></list></sounds><variables></variables><blocks></blocks><scripts></scripts><sprites><sprite name=\"Sprite\" idx=\"1\" x=\"0\" y=\"0\" heading=\"90\" scale=\"1\" rotation=\"1\" draggable=\"true\" costume=\"0\" color=\"80,80,80\" pen=\"tip\" id=\"8\"><costumes><list id=\"9\"></list></costumes><sounds><list id=\"10\"></list></sounds><variables></variables><blocks></blocks><scripts></scripts></sprite></sprites></stage><hidden></hidden><headers></headers><code></code><blocks></blocks><variables></variables><editing></editing></project>"}';
$json = json_decode($log, true);

$keys = ['message', 'time', 'projectID', 'data', 'code'];

foreach ($keys as $key) {
    if (!array_key_exists($key, $json)) {
        $json[$key] = '';
    }
}

$message = $mysqli->escape_string($json['message']);
$timestamp = $mysqli->escape_string($json['time']);
$projectID = $mysqli->escape_string($json['projectID']);
$data = $mysqli->escape_string($json['data']);
$code = $mysqli->escape_string($json['code']);


$query = "INSERT INTO $table (message, time, projectID, data, code) VALUES(
    '$message', FROM_UNIXTIME($timestamp), '$projectID', '$data', '$code');";

if (!$mysqli->query($query)) {
    die ("Logging failed: (" . $mysqli->errno . ") " . $mysqli->error);
}

?>
