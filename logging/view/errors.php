<?php

include '../config.php';

?>

<!doctype html>

<html>
    <head>
        <meta charset="UTF-8">
		<title>Javascript Errors</title>
		<link rel="stylesheet" type="text/css" href="table.css">
        <style>
            table tr {
                text-align: left;
            }
        </style>
    </head>
    
    <body>
        <h1>Recent Errors</h1>
        <table>
            <tr><th>Count</th><th>Time</th><th>Message</th><th>Stack</th><th>Browser</th><th>Assignment</th><th>Project ID</th></tr>
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
                    echo "<td>" . $row["count"] . "</td>";
                    echo "<td>" . $row["time"] . "</td>";
                    
                    $data = $row["data"];
                    $json = json_decode($data, true);
                    if (is_array($json) && array_key_exists("message", $json)) {
                        echo "<td>" . htmlentities($json["message"]) . "</td>";
                        if (array_key_exists("stack", $json)) {
                            echo "<td><pre>" . $json["stack"] . "</pre></td>";
                        } else {
                            echo "<td><pre>";
                            foreach ($json as $key => $value) {
                                if ($key == "message") continue;
                                echo "$key: $value\n";
                            }
                            echo "</pre></td>";
                        }
                        if (array_key_exists("browser", $json)) {
                            echo "<td>" . $json["browser"] . "</td>";
                        } else {
                            echo "<td></td>";
                        }
                    } else {
                        echo "<td>" . htmlentities($json) . "</td>";
                        echo "<td></td><td></td>";
                    }
                    
                    $assignmentID = $row["assignmentID"];
                    $projectID = $row["projectID"];
                    echo "<td>$assignmentID</td>";
                    echo "<td><a target='_blank' href='display.php?id=$projectID&assignment=$assignmentID'>$projectID</a></td>"; 
                    
                    echo "</tr>\n";   
                }
            ?>
        </table>
    </body>
</html>