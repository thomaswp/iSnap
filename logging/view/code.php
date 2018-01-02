<?php

include('../config.php');

if ($enable_viewer) {
	$mysqli = new mysqli($host, $user, $password, $db);
	if ($mysqli->connect_errno) {
		die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
	}

	$id = $mysqli->real_escape_string($_GET['id']);

	$query =
"SELECT code
FROM $table AS logs JOIN (
  SELECT id, time, projectID FROM $table
  WHERE id = $id
) AS target
WHERE logs.time <= target.time AND logs.projectID = target.projectID AND code <> ''
ORDER BY logs.time DESC LIMIT 1;";

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