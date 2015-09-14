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
				margin-left: 1200px;
				height: 100%;
			}
			#content {
				float: right;
				width: 100%;
				display: block;
				height: 100%;
			}
			#sidebar {
				float: left;
				width: 1180px;
				margin-left: -1200px;
				height: 100%;
			}
			#cleared {
				clear: both;
			}
			.thin {
				width: 350px;
				word-wrap: break-word;
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
						$id = $_GET['id'];
						
						echo "<h3>Project: $id</h3>";
						
						$mysqli = new mysqli($host, $user, $password, $db);
						if ($mysqli->connect_errno) {
							die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
						}
						
						$query = "SELECT id, time, message, data, code <> '' as link FROM $table WHERE projectID='$id'";
						$result = $mysqli->query($query); 
						if (!$result) {
							die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
						}
						
						echo "<table cellspacing='0'>";
						echo "<thead><th>Time</th><th>Message</th><th>Data</th></thead>";
						while($row = mysqli_fetch_array($result)) {
							
							$id = $row['id'];
							$time = $row['time'];
							$message = $row['message'];
							$data = $row['data'];
							$link = $row['link'];
							
							$first = $time;
							if ($link) $first = "<a href='#' onclick='loadSnap(\"$id\")'>$first</a>";
							
							echo "<tr><td>$first</td><td>$message</td><td><div class='thin'>$data</div></td></tr>";
						}
						echo "</table>";
					} else {
						echo "You do not have permission to view this page";
					}
				?>
				</div>
			</div>
			<div id="cleared"></div>
		</div>
	</body>
</html>