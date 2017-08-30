-- phpMyAdmin SQL Dump
-- version 4.3.11
-- http://www.phpmyadmin.net
--
-- Host: 127.0.0.1
-- Generation Time: Sep 09, 2015 at 06:18 PM
-- Server version: 5.6.24
-- PHP Version: 5.6.8

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

-- --------------------------------------------------------

--
-- Table structure for table `trace`
--

DROP TABLE IF EXISTS `trace`;

CREATE TABLE IF NOT EXISTS `trace` (
  `id` int NOT NULL AUTO_INCREMENT,
  `time` datetime NOT NULL,
  `message` varchar(64) NOT NULL,
  `data` text NOT NULL,
  `assignmentID` varchar(40) NOT NULL,
  `userID` varchar(255),
  `projectID` varchar(40) NOT NULL,
  `sessionID` varchar(40) NOT NULL,
  `browserID` varchar(40) NOT NULL,
  `code` text NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE trace ADD INDEX (assignmentID);
ALTER TABLE trace ADD INDEX (userID);
ALTER TABLE trace ADD INDEX (message);
ALTER TABLE trace ADD INDEX (projectID);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
