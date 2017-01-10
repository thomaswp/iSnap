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
			if ($enble_viewer) {
				$mysqli = new mysqli($host, $user, $password, $db);
				if ($mysqli->connect_errno) {
					die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
				}
				
				$query = "SELECT projectID, assignmentID, min(time) as start, max(time) as end, count(*) as logs FROM `$table` " .
					"WHERE projectID <> '' GROUP BY projectID, assignmentID HAVING count(*) > 1 ORDER BY end DESC";
				$result = $mysqli->query($query); 
				if (!$result) {
					die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
				}
				
				echo "<table cellspacing='0'>";
				echo "<thead><th>Project ID</th><th>Assignment</th><th>Start</th><th>End</th><th>Logs</th></thead>";
				while($row = mysqli_fetch_array($result)) {
					$projectID = $row['projectID'];
					$assignmentID = $row['assignmentID'];
					$start = $row['start'];
					$end = $row['end'];
					$logs = $row['logs'];
					echo "<tr><td><a target='_blank' href='display.php?id=$projectID&assignment=$assignmentID'>$projectID</a></td>
						<td>$assignmentID</td><td>$start</td><td>$end</td><td>$logs</td></tr>";
				}
				echo "</table>";
				
			} else {
				echo "You do not have permission to view this page";
			}
		?>
	</body>
</html>