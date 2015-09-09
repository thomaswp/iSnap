<?php

include "config.php";

$mysqli = new mysqli($host, $user, $password, $db);
if ($mysqli->connect_errno) {
    die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
}

$log =  file_get_contents("php://input");
$json = json_decode($log, true);
echo $json['message'];

$keys = ['message', 'time', 'projectID', 'data', 'code'];

foreach ($keys as $key) {
    if (!array_key_exists($key, $json)) {
        $json[$key] = '';
    }
}

$message = $mysqli->escape_string($json['message']);
$timestamp = date("Y-m-d H:i:s", $json['time'] / 1000);
$projectID = $mysqli->escape_string($json['projectID']);
$data = $mysqli->escape_string($json['data']);
$code = $mysqli->escape_string($json['code']);


$query = "INSERT INTO $table (message, time, projectID, data, code) VALUES(
    '$message', '$timestamp', '$projectID', '$data', '$code');";

echo $query;

if (!$mysqli->query($query)) {
    die ("Logging failed: (" . $mysqli->errno . ") " . $mysqli->error);
}

?>
