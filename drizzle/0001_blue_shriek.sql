CREATE TABLE `businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(20) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `businesses_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `cash_registers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`shiftId` int,
	`date` date NOT NULL,
	`openingAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`closingAmount` decimal(10,2),
	`expectedAmount` decimal(10,2),
	`difference` decimal(10,2),
	`cashWithdrawn` decimal(10,2) NOT NULL DEFAULT '0',
	`cardWithdrawn` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cash_registers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`resolvedAt` timestamp,
	`resolvedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`supplier` varchar(255),
	`currentStock` decimal(10,2) NOT NULL DEFAULT '0',
	`minimumStock` decimal(10,2) NOT NULL DEFAULT '0',
	`unit` varchar(50) NOT NULL DEFAULT 'unidad',
	`costPrice` decimal(10,2),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`transactionId` int,
	`supplier` varchar(255),
	`invoiceNumber` varchar(100),
	`invoiceDate` date,
	`baseAmount` decimal(10,2),
	`vatRate` decimal(5,2),
	`vatAmount` decimal(10,2),
	`totalAmount` decimal(10,2),
	`imageUrl` text,
	`imageKey` varchar(255),
	`ocrData` text,
	`ocrStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`isVerified` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`inventoryItemId` int,
	`itemName` varchar(255) NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`unitPrice` decimal(10,2),
	`totalPrice` decimal(10,2),
	`received` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`supplier` varchar(255),
	`orderDate` date NOT NULL,
	`expectedDelivery` date,
	`actualDelivery` date,
	`status` enum('pending','ordered','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`totalAmount` decimal(10,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scheduledDate` date NOT NULL,
	`scheduledStart` varchar(5) NOT NULL,
	`scheduledEnd` varchar(5) NOT NULL,
	`actualStart` timestamp,
	`actualEnd` timestamp,
	`hoursWorked` decimal(5,2),
	`notes` text,
	`status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryItemId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('in','out','adjustment') NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`previousStock` decimal(10,2) NOT NULL,
	`newStock` decimal(10,2) NOT NULL,
	`reason` varchar(255),
	`orderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int,
	`createdBy` int NOT NULL,
	`assignedTo` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`dueDate` date,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`cashRegisterId` int,
	`userId` int NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`category` varchar(100),
	`concept` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`paymentMethod` enum('cash','card','transfer','other') NOT NULL DEFAULT 'cash',
	`date` date NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`weekStart` date NOT NULL,
	`weekEnd` date NOT NULL,
	`totalIncome` decimal(12,2) NOT NULL DEFAULT '0',
	`totalExpenses` decimal(12,2) NOT NULL DEFAULT '0',
	`totalCashWithdrawn` decimal(12,2) NOT NULL DEFAULT '0',
	`totalCardWithdrawn` decimal(12,2) NOT NULL DEFAULT '0',
	`totalDifference` decimal(12,2) NOT NULL DEFAULT '0',
	`totalHoursWorked` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_summaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `pin` varchar(6);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;