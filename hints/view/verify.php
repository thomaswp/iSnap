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
				width: 550px;
				display: block;
				height: 100%;
			}
			#sidebar {
				width: calc(100% - 560px);
				height: 100%;
				float: left;
			}
			#cleared {
				clear: both;
			}
			.pass {
				color: green;
			}
			.fail {
				color: red;
			}
		</style>
		<script type="text/javascript" src="../../logging/config.js"></script>
		<script type="text/javascript" src="../config.js"></script>
		<script type="text/javascript">
			function loadSnap(id, project, assignment, data, type) {
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function() {
					if (xhr.readyState==4 && xhr.status==200) {
						var contentWindow = document.getElementById('snap').contentWindow;
						contentWindow.assignmentID = assignment;
						contentWindow.ide.droppedText(xhr.responseText);
						data = JSON.parse(data);
						data.type = type;
						window.setTimeout(function() {
							contentWindow.hintProvider.showLoggedHint(data);
						}, 100);
					}
				};
				xhr.open("GET", "../../logging/view/code.php?id=" + id + "&project=" + project, true);
				xhr.send();
				window.location.hash = id;
				window.index = rows.findIndex(function(a) {
					return a.dataset.rid == id;
				});
			}

			// credit: http://www.html5rocks.com/en/tutorials/cors/
			function createCORSRequest(method, url) {
				var xhr = new XMLHttpRequest();
				if ('withCredentials' in xhr) {
					// Check if the XMLHttpRequest object has a "withCredentials" property.
					// "withCredentials" only exists on XMLHTTPRequest2 objects.
					xhr.open(method, url, true);
				} else if (typeof XDomainRequest != 'undefined') {
					// Otherwise, check if XDomainRequest.
					// XDomainRequest only exists in IE, and is IE's way of making CORS
					// requests
					xhr = new XDomainRequest();
					xhr.open(method, url);
				} else {
					// Otherwise, CORS is not supported by the browser.
					xhr = null;
				}
				return xhr;
			}

			function compareHints(a, b) {
				var hintsA = JSON.parse(a);
				var hintsB = JSON.parse(b);

				if (hintsA.length !== hintsB.length) {
					console.log(hintsA.length, 'vs', hintsB.length);
					return false;
				}

				var same = true;
				for (var i = 0; i < hintsA.length; i++) {
					var dataA = hintsA[i].data;
					var dataB = hintsB[i].data;
					if (!areHintsEqual(dataA, dataB)) {
						console.log(dataA, 'vs', dataB);
						same = false;
					}
				}
				return same;
			}

			function areHintsEqual(dataA, dataB) {
				if (JSON.stringify(dataA.from) !== JSON.stringify(dataB.from) ||
						JSON.stringify(dataA.to) !== JSON.stringify(dataB.to)) {
					return false;
				}
				if (!areRootsEqual(dataA.root, dataB.root)) return false;
				return true;
			}

			function areRootsEqual(rootA, rootB) {
				if (rootA == null) return rootB == null;
				if (rootB == null) return false;
				return rootA.index === rootB.index &&
					rootA.label === rootB.label &&
					areRootsEqual(rootA.parent, rootB.parent);
			}

			var verifyCallback;

			function verify(id, project, assignment, data) {
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function() {
					if (xhr.readyState==4 && xhr.status==200) {
						var xml = xhr.responseText;
						var cors = createCORSRequest('POST',
							getHintURL() + '?assignmentID=' + assignment);
						cors.onload = function() {
							var hints = cors.responseText;
							var link = document.getElementById('v' + id);
							if (compareHints(data, hints)) {
								link.innerHTML = 'Pass!';
								link.classList.add('pass');
							} else {
								link.innerHTML = 'Fail!';
								link.classList.add('fail');
							}
							if (verifyCallback) verifyCallback();
						};

						cors.onerror = function(e) {
							console.error('Error contacting hint server!');
						};

						cors.send(xml);
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

	$assignment = $mysqli->escape_string($_GET['assignment']);

	$query =
		"SELECT
			hint.assignmentID AS assignmentID, hint.projectID AS projectID, hint.id AS id, hint.time AS time, hint.message AS message,
			hint.data AS hintData, proc.data AS procData, proc.code AS procCode
		FROM (
			SELECT *, FLOOR(UNIX_TIMESTAMP(time)) AS g
			FROM trace
			WHERE message='HintProvider.processHints' AND assignmentID='$assignment'
		) AS proc JOIN (
			SELECT *, FLOOR(UNIX_TIMESTAMP(time)) AS g
			FROM trace
			WHERE message LIKE 'SnapDisplay.show%Hint' AND assignmentID='$assignment'
		) AS hint ON proc.assignmentID=hint.assignmentID AND proc.projectID=hint.projectID AND proc.g=hint.g
		";

	$result = $mysqli->query($query);
	if (!$result) {
		die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
	}

	echo "<table cellspacing='0'>";
	echo "<thead><th>Log ID</th><th>Project ID</th><th>Verify</th><th>Time</th></thead>";
	while($row = mysqli_fetch_array($result)) {
		$id=$row['id'];
		$assignmentID = $row['assignmentID'];
		$projectID = $row['projectID'];
		$displayID = substr($projectID, 0, strpos($projectID, '-'));
		$type = $row['message'];
		$type = str_replace('SnapDisplay.show', '', $type);
		$time = $row['time'];
		$hintData = json_encode($row['hintData']);
		$procData = json_encode($row['procData']);
		$onclick = "loadSnap(\"$id\", \"$projectID\", \"$assignmentID\", $hintData, \"$type\")";
		$onclick = htmlspecialchars($onclick);
		$contextLink = "../../logging/view/display.php?id=$projectID&assignment=$assignmentID#$id";
		$verify = "verify(\"$id\", \"$projectID\", \"$assignmentID\", $procData)";
		$verify = htmlspecialchars($verify);
		echo "<tr><td id='$id'>
			<a class='rlink' data-rid='$id' href='#' onclick=\"$onclick\">$id</a>
			</td>
			<td>$assignmentID </br>
			<a href='$contextLink' target='_blank' title='See the full logs for this attempt...'>$displayID</a></td>
			<td><b class='vlink'' id='v$id' onclick=\"$verify\">Verify</b></td>
			<td>$time</td></tr>";
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
				var rows = [].slice.call(
					document.getElementsByClassName("rlink"));
				var index = 0;
				document.addEventListener('keypress', function(event) {
					var code = event.which || event.keyCode;
					if (code === 100 && index < rows.length - 1) {
						rows[++index].onclick();
					} else if (code === 97 && index > 0) {
						rows[--index].onclick();
					}
				});
				var hash = parseInt(window.location.hash.replace("#", ""));
				if (!isNaN(hash)) {
					index = rows.findIndex(function(a) {
						return a.dataset.rid == hash;
					});
				}
				var snap = document.getElementById("snap");
				snap.onload = function() {
					snap.contentWindow.ide.toggleStageSize();
					if (index > 0 && rows.length > 0) {
						rows[index].onclick();
					}
				}

				var vRows = [].slice.call(
					document.getElementsByClassName("vlink"));
				var vi = 0;
				verifyCallback = function() {
					if (vi < vRows.length) {
						vRows[vi++].onclick();
					}
				}
				verifyCallback();
			</script>
		</div>
	</body>
</html>