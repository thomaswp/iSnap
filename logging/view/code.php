<?php

include('../config.php');

if ($enble_viewer) {
	$mysqli = new mysqli($host, $user, $password, $db);
	if ($mysqli->connect_errno) {
		die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
	}
	
	$id = $_GET['id'];
	
	$query = "SELECT code FROM $table WHERE id=$id";
	$result = $mysqli->query($query); 
	if (!$result) {
		die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
	}
	
	header('Content-Type: text/xml');
	while($row = mysqli_fetch_array($result)) {
		echo $row['code'];
		break;	
	}
}

?>