CREATE TABLE `external_reservation_communications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalReservationId` int NOT NULL,
	`channel` enum('email','whatsapp','other') NOT NULL,
	`status` enum('pending','prepared','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
	`messageType` varchar(100) NOT NULL DEFAULT 'arrival',
	`notes` text,
	`sentAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `external_reservation_communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `external_upcoming_reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importRunId` int NOT NULL,
	`provider` enum('cloudbeds') NOT NULL DEFAULT 'cloudbeds',
	`sourceReservationId` varchar(100) NOT NULL,
	`reservationCode` varchar(100),
	`guestName` varchar(255),
	`guestEmail` varchar(320),
	`guestPhone` varchar(80),
	`checkInDate` varchar(10) NOT NULL,
	`checkOutDate` varchar(10),
	`roomType` varchar(255),
	`roomNumber` varchar(100),
	`reservationStatus` varchar(80),
	`bookingSource` varchar(255),
	`isReviewed` boolean NOT NULL DEFAULT false,
	`rawData` text,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `external_upcoming_reservations_id` PRIMARY KEY(`id`)
);
