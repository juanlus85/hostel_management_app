CREATE TABLE `room_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomNumber` varchar(10) NOT NULL,
	`date` varchar(10) NOT NULL,
	`status` enum('checkout','continues','empty') NOT NULL,
	`beds` int,
	`notes` text,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `room_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','housekeeping') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `incidents` ADD `updatedBy` int;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `createdBy` int;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `updatedBy` int;--> statement-breakpoint
ALTER TABLE `invoices` ADD `updatedBy` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `updatedBy` int;