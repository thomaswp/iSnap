<?php

include '../../logging/config.php';

?>

<!doctype html>

<html>

	<head>
		<meta charset="UTF-8">
		<title>View Project</title>
		<link rel="stylesheet" type="text/css" href="../../logging/view/table.css">
		<style>
			html {
				height: 100%;
			}
			body {
				height: calc(100% - 20px);
			}
			/* Credit: http://stackoverflow.com/questions/5645986/two-column-div-layout-with-fluid-left-and-fixed-right-column */
			#wrapper {
				height: 100%;
			}
			#content {
				float: right;
				width: 650px;
				display: block;
				height: 100%;
			}
			#sidebar {
				width: calc(100% - 660px);
				height: 100%;
				float: left;
			}
			#cleared {
				clear: both;
			}
		</style>
		<script type="text/javascript">
			function loadSnap(id, project, assignment) {
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function() {
					if (xhr.readyState==4 && xhr.status==200) {
						var contentWindow = document.getElementById('snap').contentWindow;
						contentWindow.assignmentID = assignment;
						contentWindow.ide.droppedText(xhr.responseText);
					}
				};
				xhr.open("GET", "../../logging/view/code.php?id=" + id + "&project=" + project, true);
				xhr.send();
			}
		</script>
	</head>

	<body>
		<div id="wrapper">
			<div id="sidebar">
				 <iframe id="snap" width="100%" height="100%" src="../../snap.html?assignment=view&hints=true"></iframe>
			</div>
			<div id="content">
				<div style="overflow: scroll; height: 100%;">
				<?php
if ($enble_viewer) {

	$mysqli = new mysqli($host, $user, $password, $db);
	if ($mysqli->connect_errno) {
		die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
	}

	$query = "SELECT * FROM `trace` WHERE message LIKE 'SnapDisplay.show%Hint' ORDER BY assignmentID, projectID, time";
	$result = $mysqli->query($query);
	if (!$result) {
		die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
	}

	echo "<table cellspacing='0'>";
	echo "<thead><th>Assignment</th><th>Project ID</th><th>Type</th><th>Time</th></thead>";
	while($row = mysqli_fetch_array($result)) {
		$id=$row['id'];
		$assignmentID = $row['assignmentID'];
		$projectID = $row['projectID'];
		$displayID = substr($projectID, 0, strpos($projectID, '-'));
		$type = $row['message'];
		$type = str_replace('SnapDisplay.show', '', $type);
		$time = $row['time'];
		echo "<tr><td>$assignmentID</td><td><a href='#' onclick='loadSnap(\"$id\", \"$projectID\", \"$assignmentID\")'>$displayID</a></td>
			<td>$type</td><td>$time</td></tr>";
	}
	echo "</table>";

} else {
	echo "You do not have permission to view this page";
}
				?>
				</div>
			</div>
			<div id="cleared"></div>
			<script type="text/javascript">
				var snap = document.getElementById("snap");
				snap.onload = function() {
					snap.contentWindow.ide.toggleStageSize();
				}
			</script>
		</div>
	</body>
</html>