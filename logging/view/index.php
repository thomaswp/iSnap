<?php

include '../config.php';

?>

<!doctype html>

<html>

	<head>
		<meta charset="UTF-8">
		<title>List Projects</title>
		<link rel="stylesheet" type="text/css" href="table.css">
	</head>

	<body>
		<h1>Projects</h1>
		<p>Please select a project to view:</p>
		<?php

if ($enable_viewer) {
	$mysqli = new mysqli($host, $user, $password, $db);
	if ($mysqli->connect_errno) {
		die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
	}

	$where = "WHERE projectID <> ''";
	foreach (['userID', 'assignmentID', 'projectID'] as $filter) {
		$value = isset($_GET[$filter]) ? $_GET[$filter] : null;
		if ($value) {
			$value = $mysqli->escape_string($value);
			$where = "$where AND $filter = '$value'";
		}
	}

	$query = "SELECT projectID, assignmentID, userID, min(time) as start, max(time) as end, count(*) as logs FROM `$table` " .
		"$where GROUP BY projectID, assignmentID, userID HAVING count(*) > 1 ORDER BY end DESC";
	$result = $mysqli->query($query);
	if (!$result) {
		die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
	}

	echo "<table cellspacing='0'>";
	echo "<thead><th>Project ID</th><th>Assignment</th><th>User</th><th>Start</th><th>End</th><th>Logs</th><th>Hints</th></thead>";
	while($row = mysqli_fetch_array($result)) {
		$projectID = $row['projectID'];
		$assignmentID = $row['assignmentID'];
		$userID = $row['userID'];
		$shortUserID = substr($userID, max(0, strlen($userID) - 8));
		$start = $row['start'];
		$end = $row['end'];
		$logs = $row['logs'];
		$encodedUserID = urlencode($userID);
		$link = "display.php?id=$projectID&assignment=$assignmentID&userID=$encodedUserID";
		$hints = "../../hints/view/?project=$projectID&assignment=$assignmentID&userID=$encodedUserID";
		echo "<tr><td><a target='_blank' href='$link'>$projectID</a></td>
			<td>$assignmentID</td><td>$shortUserID</td><td>$start</td><td>$end</td>
			<td>$logs</td><td><a target='_blank'  href='$hints'>Hints</a></td></tr>";
	}
	echo "</table>";

} else {
	echo "You do not have permission to view this page";
}

		?>
	</body>
</html>