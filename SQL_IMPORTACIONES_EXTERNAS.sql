-- Ejecutar una única vez en el VPS antes de activar el módulo de Importaciones externas.
-- No modifica cajas, facturas, reservas ni ningún dato operativo existente.
CREATE TABLE IF NOT EXISTS `external_import_runs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `provider` enum('loyverse','cloudbeds') NOT NULL,
  `importType` enum('daily_cash','future') NOT NULL DEFAULT 'daily_cash',
  `status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
  `dateFrom` varchar(10),
  `dateTo` varchar(10),
  `recordsImported` int NOT NULL DEFAULT 0,
  `totalAmount` decimal(12,2) NOT NULL DEFAULT 0,
  `errorMessage` text,
  `metadata` text,
  `createdBy` int NOT NULL,
  `startedAt` timestamp NULL,
  `finishedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `external_daily_cash_records` (
  `id` int AUTO_INCREMENT NOT NULL,
  `importRunId` int NOT NULL,
  `provider` enum('loyverse','cloudbeds') NOT NULL,
  `sourceStoreId` varchar(100),
  `sourceStoreName` varchar(255),
  `sourceShiftId` varchar(100),
  `businessLabel` varchar(255),
  `businessDate` varchar(10) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'EUR',
  `openingCash` decimal(12,2) NOT NULL DEFAULT 0,
  `closingCash` decimal(12,2) NOT NULL DEFAULT 0,
  `cashSales` decimal(12,2) NOT NULL DEFAULT 0,
  `cardSales` decimal(12,2) NOT NULL DEFAULT 0,
  `totalSales` decimal(12,2) NOT NULL DEFAULT 0,
  `rawData` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `external_daily_cash_records_run_idx` (`importRunId`),
  INDEX `external_daily_cash_records_date_idx` (`businessDate`)
);

CREATE TABLE IF NOT EXISTS `external_upcoming_reservations` (
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
  `importedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `external_upcoming_reservations_arrival_idx` (`checkInDate`),
  INDEX `external_upcoming_reservations_source_idx` (`sourceReservationId`)
);

CREATE TABLE IF NOT EXISTS `external_reservation_communications` (
  `id` int AUTO_INCREMENT NOT NULL,
  `externalReservationId` int NOT NULL,
  `channel` enum('email','whatsapp','other') NOT NULL,
  `status` enum('pending','prepared','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
  `messageType` varchar(100) NOT NULL DEFAULT 'arrival',
  `notes` text,
  `sentAt` timestamp NULL,
  `createdBy` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `external_reservation_communications_reservation_idx` (`externalReservationId`)
);
