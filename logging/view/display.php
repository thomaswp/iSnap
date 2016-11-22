<?php

include '../config.php';

?>

<!doctype html>

<html>

	<head>
		<meta charset="UTF-8">
		<title>View Project</title>
		<link rel="stylesheet" type="text/css" href="table.css">
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
				width: 800px;
				display: block;
				height: 100%;
			}
			#sidebar {
				width: calc(100% - 810px);
				height: 100%;
				float: left;
			}
			#cleared {
				clear: both;
			}
		</style>
		<script type="text/javascript">
			function loadSnap(id, project) {
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function() {
					if (xhr.readyState==4 && xhr.status==200) {
						document.getElementById('snap').contentWindow.ide.droppedText(xhr.responseText);
					}
				};
				xhr.open("GET", "code.php?id=" + id + "&project=" + project, true);
				xhr.send();
			}
		</script>
	</head>

	<body>
		<div id="wrapper">
			<div id="sidebar">
				 <iframe id="snap" width="100%" height="100%" src="../../snap.html?assignment=view"></iframe>
			</div>
			<div id="content">
				<div style="overflow: scroll; height: 100%;">
				<?php
function tryGetParam($key) {
	return array_key_exists($key, $_GET) ? mysql_real_escape_string($_GET[$key]) : NULL;
}

if ($enble_viewer) {

	$id = mysql_real_escape_string($_GET['id']);
	$assignment = tryGetParam('assignment');
	$start = tryGetParam('start');
	$end = tryGetParam('end');
	$snapshots = tryGetParam('snapshots');

	echo "<h3>Project: $id</h3>";
	echo "<p>This lists all logs for this project. Click on a date to see the code at that time.</p>";

	$mysqli = new mysqli($host, $user, $password, $db);
	if ($mysqli->connect_errno) {
		die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
	}

	$where = "WHERE projectID='$id'";
	if ($assignment) {
		$where .= " AND assignmentID = '$assignment'";
	}
	if ($start) {
		$where .= " AND id >= $start";
	}
	if ($end) {
		$where .= " AND id <= $end";
	}
	if ($snapshots === 'true') {
		$where .= " AND code <> ''";
	}
	$query = "SELECT id, time, message, data, code <> '' AS link, sessionID FROM $table $where";
	$result = $mysqli->query($query);
	if (!$result) {
		die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
	}

	echo "<table cellspacing='0'>";
	echo "<thead><th>Time</th><th>Message</th><th>Data</th><th>Session</th></thead>";
	while($row = mysqli_fetch_array($result)) {

		$rid = $row['id'];
		$time = $row['time'];
		$message = $row['message'];
		$data = $row['data'];
		$link = $row['link'];
		$sessionID = $row['sessionID'];

		$sessionID = substr($sessionID, 0, 3);

		$first = $time;
		if ($link) $first = "<a href='#$rid' onclick='loadSnap(\"$rid\", \"$id\")'>$first</a>";

		$link = "http://www.bodurov.com/JsonFormatter/view.aspx?json=" . urlencode($data);

		$link_text = $data;
		$cutoff = 45;
		if ($link_text == "\"\"") $link_text = "";
		if (strlen($link_text) > $cutoff) {
			$link_text = substr($link_text, 0, $cutoff) . "...";
		}
		$link = "<a target='_blank' href='$link' title='$data'>$link_text</a>";

		echo "<tr><td>$first</td><td>$message</td><td>$link</td><td>$sessionID</td></tr>";
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