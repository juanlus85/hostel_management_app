CREATE TABLE `access_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomNumber` varchar(10) NOT NULL,
	`roomCode` varchar(10) NOT NULL,
	`roomType` varchar(255) NOT NULL,
	`floor` varchar(50) NOT NULL,
	`floorLevel` varchar(50) NOT NULL,
	`entranceCode` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `access_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_codes_roomNumber_unique` UNIQUE(`roomNumber`)
);
