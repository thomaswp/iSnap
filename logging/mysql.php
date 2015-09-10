<?php

include "config.php";

try {

    $mysqli = new mysqli($host, $user, $password, $db);
    if ($mysqli->connect_errno) {
        http_response_code(503);
        die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
    }
    
    $post =  file_get_contents("php://input");
    $json = json_decode($post, true);
    
    $userInfo = $json['userInfo'];
    $assignmentID = $mysqli->escape_string($userInfo['assignmentID']);
    $browserID = $mysqli->escape_string($userInfo['browserID']);
    $sessionID = $mysqli->escape_string($userInfo['sessionID']);
    
    $logs = $json['logs'];
    
    foreach ($logs as $log) {
    
        $keys = ['message', 'time', 'projectID', 'data', 'code'];
    
        foreach ($keys as $key) {
            if (!array_key_exists($key, $log)) {
                $log[$key] = '';
            }
        }
    
        $message = $mysqli->escape_string($log['message']);
        $timestamp = date("Y-m-d H:i:s", $log['time'] / 1000);
        $projectID = $mysqli->escape_string($log['projectID']);
        $data = $mysqli->escape_string(json_encode($log['data']));
        $code = $mysqli->escape_string($log['code']);
    
    
        $query = "INSERT INTO $table (message, time, assignmentID, projectID, browserID, sessionID, data, code)
            VALUES('$message', '$timestamp', '$assignmentID', '$projectID', '$browserID', '$sessionID', '$data', '$code');";
    
    
        if (!$mysqli->query($query)) {
            echo ("Logging failed: (" . $mysqli->errno . ") " . $mysqli->error);
        }
    
    }

} catch (Exception $e) {
    http_response_code(500);
    die ("Error: " . $e);
}

?>
