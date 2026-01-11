CREATE TABLE `historical_cash_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`businessType` enum('hostel','tienda') NOT NULL,
	`totalZ` decimal(12,2) NOT NULL DEFAULT '0',
	`totalCash` decimal(12,2) NOT NULL DEFAULT '0',
	`totalCards` decimal(12,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `historical_cash_data_id` PRIMARY KEY(`id`)
);
