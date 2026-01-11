CREATE TABLE `weekly_availability_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weekStart` varchar(10) NOT NULL,
	`sourceId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_availability_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_availability_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('bank','cash_register','safe') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_availability_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_cash_envelopes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weekStart` varchar(10) NOT NULL,
	`dayOfWeek` int NOT NULL,
	`expectedCash` decimal(10,2) NOT NULL DEFAULT '0',
	`actualCash` decimal(10,2) NOT NULL DEFAULT '0',
	`difference` decimal(10,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_cash_envelopes_id` PRIMARY KEY(`id`)
);
