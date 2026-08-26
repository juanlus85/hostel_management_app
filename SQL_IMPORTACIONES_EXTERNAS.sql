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
