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
				width: 600px;
				display: block;
				height: 100%;
			}
			#sidebar {
				width: calc(100% - 610px);
				height: 100%;
				float: left;
			}
			#cleared {
				clear: both;
			}
		</style>
		<script type="text/javascript">
			function loadSnap(id) {
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function() {
					if (xhr.readyState==4 && xhr.status==200) {
						document.getElementById('snap').contentWindow.ide.droppedText(xhr.responseText);
					}
				};
				xhr.open("GET", "code.php?id=" + id, true);
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
					if ($enble_viewer) {
						$assignment = $_GET['assignment'];
						$time = $_GET['time'];
						
						echo "<h3>Projects: $assignment</h3>";
						
						$mysqli = new mysqli($host, $user, $password, $db);
						if ($mysqli->connect_errno) {
							die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
						}
						
						// $query = "SELECT max(id) AS id, time, projectID FROM $table WHERE assignmentID='guess1Lab' AND message='IDE.exportProject' AND time < '$time' GROUP BY projectID ORDER BY time ASC;";
						$query = "SELECT id, time, projectID FROM $table WHERE assignmentID='guess1Lab' AND message='IDE.exportProject' AND time < '$time' ORDER BY projectID, time ASC;";
						$result = $mysqli->query($query); 
						if (!$result) {
							die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
						}
						
						echo "<table cellspacing='0'>";
						echo "<thead><th>Time</th><th>ID</th><th>Project</th></thead>";
						while($row = mysqli_fetch_array($result)) {
							
							$id = $row['id'];
							$time = $row['time'];
							$projectID = $row['projectID']; 
							
							$first = $time;
							$first = "<a href='#$id' onclick='loadSnap(\"$id\")'>$first</a>";
														
							echo "<tr><td>$first</td><td>$id</td><td>$projectID</td></tr>";
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