<?php
include '../../../logging/config.php';

$mysqli = new mysqli($host, $user, $password, $db);
if ($mysqli->connect_errno) {
    die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
}

$hintID = $mysqli->escape_string($_GET['hintID']);

$hintCode = "hintCode";
$updatedTime = "updatedTime";

$date = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $priority = $mysqli->escape_string($_GET['priority']);
    $code = $mysqli->escape_string(file_get_contents('php://input'));
    $date = date('Y-m-d H:i:s');
    $query = "UPDATE handmade_hints SET $hintCode='$code', $updatedTime='$date', priority='$priority'
        WHERE hid=$hintID";
} else {
    $query = "SELECT $hintCode FROM handmade_hints
            WHERE hid=$hintID";
}

$result = $mysqli->query($query);
if (!$result) {
    die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
}

if ($date) {
    echo $date;
    return;
}

while($row = mysqli_fetch_array($result)) {
    echo $row[$hintCode];
    break;
}
?>
