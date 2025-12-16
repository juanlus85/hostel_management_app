CREATE TABLE `shift_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`dayOfWeek` int NOT NULL,
	`userId` int NOT NULL,
	`scheduledStart` varchar(5) NOT NULL,
	`scheduledEnd` varchar(5) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shift_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactName` varchar(255),
	`phone` varchar(50),
	`email` varchar(320),
	`address` text,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `paymentMethod` enum('cash','card','transfer','cuenta_bancaria','ana','juanlu','caja_hostel','caja_tienda','caja_fuerte','caja_fuerte_cambio','other') NOT NULL DEFAULT 'cash';--> statement-breakpoint
ALTER TABLE `invoices` ADD `paymentMethodInvoice` enum('cuenta_bancaria','tarjeta','ana','juanlu','caja_hostel','caja_tienda','caja_fuerte','caja_fuerte_cambio','otros') DEFAULT 'cuenta_bancaria';