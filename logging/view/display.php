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
				window.location.hash = id;
				window.index = rowIDs.indexOf(parseInt(id));
			}
			function copy(inp) {

				// is element selectable?
				if (inp) {
					if (window.getSelection) {
						window.getSelection().removeAllRanges();
					}
					if (document.createRange) {
						var rangeObj = document.createRange();
						rangeObj.selectNodeContents(inp);
						window.getSelection().addRange(rangeObj);
					}
					try {
						// copy text
						document.execCommand('copy');
					}
					catch (err) {
						alert('please press Ctrl/Cmd+C to copy');
					}
				}
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
function tryGetParam($key, $mysqli) {
	return array_key_exists($key, $_GET) ? $mysqli->real_escape_string($_GET[$key]) : NULL;
}

if ($enble_viewer) {

	$mysqli = new mysqli($host, $user, $password, $db);
	if ($mysqli->connect_errno) {
		die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
	}

	$id = $mysqli->real_escape_string($_GET['id']);
	$assignment = tryGetParam('assignment', $mysqli);
	$start = tryGetParam('start', $mysqli);
	$end = tryGetParam('end', $mysqli);
	$snapshots = tryGetParam('snapshots', $mysqli);

	echo "<h3>Project: $id</h3>";
	echo "<p>This lists all logs for this project. Click on a date to see the code at that time, or click here and then use the A and D keys to scroll through snapshots. Loads quickest on Chrome.</p>";

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
		// If we're viewing snapshots, we probably don't need to view block
		// grabs
		$where .= " AND message <> 'Block.grabbed'";
	}
	$query = "SELECT id, time, message, data, code <> '' AS link, sessionID FROM $table $where";
	$result = $mysqli->query($query);
	if (!$result) {
		die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
	}

	echo "<table cellspacing='0'>";
	echo "<thead><th>Time</th><th>ID</th><th>Message</th><th>Data</th></thead>";
	while($row = mysqli_fetch_array($result)) {

		$rid = $row['id'];
		$time = $row['time'];
		$message = $row['message'];
		$data = $row['data'];
		$link = $row['link'];
		$sessionID = $row['sessionID'];

		$first = $time;
		$class = "";
		if ($link) {
			$first = "<a href='#$rid' onclick='loadSnap(\"$rid\", \"$id\")'>$first</a>";
			$class = "rid";
		}

		$link = "http://www.bodurov.com/JsonFormatter/view.aspx?json=" . urlencode($data);

		$link_text = $data;
		$cutoff = 35;
		if ($link_text == "\"\"") $link_text = "";
		if (strlen($link_text) > $cutoff) {
			$link_text = substr($link_text, 0, $cutoff) . "...";
		}
		$link = "<a target='_blank' href='$link' title='$data'>$link_text</a>";

		echo "<tr><td>$first</td><td class='$class' id='$rid' title='Session ID: $sessionID'>$rid</td><td>$message</td><td>$link</td></tr>";
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
				var rowIDs = [].slice.call(document.getElementsByClassName("rid"))
					.map(function(td) { return parseInt(td.innerHTML); })
				var index = 0;
				var projectID = "<?php echo $id; ?>";
				document.addEventListener('keypress', function(event) {
					var code = event.which || event.keyCode;
					if (code === 100 && index < rowIDs.length - 1) {
						loadSnap(rowIDs[++index], projectID);
					} else if (code === 97 && index > 0) {
						loadSnap(rowIDs[--index], projectID);
					} else if (code === 99) {
						var td = document.getElementById("" + rowIDs[index]);
						console.log(td);
						copy(td);
						event.preventDefault();
						return false;
					}
				});
				var hash = parseInt(window.location.hash.replace("#", ""));
				if (!isNaN(hash)) {
					index = rowIDs.indexOf(hash);
				}
				var snap = document.getElementById("snap");
				snap.onload = function() {
					snap.contentWindow.ide.toggleStageSize();
					if (index > 0 && rowIDs.length > 0) {
						loadSnap(rowIDs[index], projectID);
					}
				}
			</script>
		</div>
	</body>
</html>