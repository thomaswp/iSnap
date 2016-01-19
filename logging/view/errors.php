<?php

include '../config.php';

?>

<!doctype html>

<html>
    <head>
        <meta charset="UTF-8">
		<title>Javascript Errors</title>
		<link rel="stylesheet" type="text/css" href="table.css">
    </head>
    
    <body>
        <h1>Recent Errors</h1>
        <a href="http://www.freeformatter.com/javascript-escape.html">JSON Escaper</a>
        <table>
            <tr><th>Count</th><th>Time</th><th>Data</th><th>Assignment</th><th>Project ID</th></tr>
            <?php
                if (!$enble_viewer) return;
                $mysqli = new mysqli($host, $user, $password, $db);
                if ($mysqli->connect_errno) {
                    die ("Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
                }
                $query = "SELECT count(*) as count, time, data, assignmentID, projectID FROM $table WHERE message='Error' GROUP BY concat(projectID,data) ORDER BY time DESC";
                $result = $mysqli->query($query); 
                if (!$result) {
                    die ("Failed to retrieve data: (" . $mysqli->errno . ") " . $mysqli->error);
                }
                while($row = mysqli_fetch_assoc($result)) {
                    echo "<tr>";
                    foreach($row as $key => $value) {
                        if ($key == "data") {
							$link = "http://www.bodurov.com/JsonFormatter/view.aspx?json=" . urlencode($value);
                            $value = htmlentities($value);
							$link = "<td><a target='_blank' href='$link' title='$value'>$value</a></td>";
                            echo $link;
                        } else if ($key == "projectID") {
                            $projectID = $row["projectID"];
                            $assignmentID = $row["assignmentID"];
                            echo "<td><a target='_blank' href='display.php?id=$projectID&assignment=$assignmentID'>$projectID</a></td>"; 
                        } else {
                            $value = htmlentities($value);
                            echo "<td>$value</td>";
                        }
                    }
                    echo "</tr>\n";   
                }
            ?>
        </table>
    </body>
</html>