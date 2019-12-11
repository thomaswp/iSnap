<?php

include '../config.php';

if (!$enable_viewer) {
	die ("You do not have permission to view this page");
}

$mysqli = new mysqli($host, $user, $password, $db);
if ($mysqli->connect_errno) {
	die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
}

?>

<!doctype html>

<html>

	<head>
		<meta charset="UTF-8">
		<title>List Projects</title>
		<link rel="stylesheet" type="text/css" href="table.css">
		<form method="GET">
			Assignment:
			<select name="assignmentID">
				<option value=''>All</option>
<?php

	$query = "SELECT DISTINCT assignmentID FROM `$table`";
	$result = $mysqli->query($query);
	while($row = mysqli_fetch_array($result)) {
		$assignmentID = $row['assignmentID'];
		$selected = (isset($_GET['assignmentID']) &&
			$_GET['assignmentID'] == $assignmentID) ? 'selected' : '';
		echo "<option $selected>$assignmentID</option>";
	}
	$editsOnly = isset($_GET['editsOnly']);
	$editsOnlyChecked = $editsOnly ? 'checked' : '';
?>
			</select>
			<input type="checkbox" name="editsOnly" value="True"  <?php echo $editsOnlyChecked ?> /> Edits only
			<input type="submit" value="Update"/>
		</form>
	</head>

	<body>
		<h1>Projects</h1>
		<p>Please select a project to view:</p>
		<?php

	$result = $mysqli->query($query);

	$where = "WHERE projectID <> ''";
	foreach (['userID', 'assignmentID', 'projectID'] as $filter) {
		$value = isset($_GET[$filter]) ? $_GET[$filter] : null;
		if ($value == '') continue;
		if ($value) {
			$value = $mysqli->escape_string($value);
			$where = "$where AND $filter = '$value'";
		}
	}
	if ($editsOnly) {
		$where .= " AND message='Block.grabbed'";
	}

	$query = "SELECT count(*) AS N FROM `$table` $where";
	$result = $mysqli->query($query);
	if (mysqli_fetch_array($result)['N'] > 1000000) {
		echo "Too many results: please filter";
		return;
	}

	$query = "SELECT projectID, assignmentID, userID, min(time) as start, max(time) as end, count(*) as logs FROM `$table` " .
		"$where GROUP BY projectID, assignmentID, userID HAVING count(*) > 1 ORDER BY end DESC";
	$result = $mysqli->query($query);
	if (!$result) {
		die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
	}

	echo "<table cellspacing='0'>";
	$logsLabel = $editsOnly ? "Edits" : "Logs";
	echo "<thead><th>Project ID</th><th>Assignment</th><th>User</th><th>Start</th><th>End</th><th>$logsLabel</th><th>Hints</th></thead>";
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

		?>
	</body>
</html>