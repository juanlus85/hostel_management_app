CREATE TABLE `issued_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`issuerBusiness` enum('The Spot Central Hostel','Sweet & Salty','Organizus') NOT NULL,
	`recipient` varchar(255),
	`invoiceNumber` varchar(100),
	`invoiceDate` varchar(10) NOT NULL,
	`totalAmount` decimal(10,2),
	`imageUrl` text,
	`imageKey` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `issued_invoices_id` PRIMARY KEY(`id`)
);
