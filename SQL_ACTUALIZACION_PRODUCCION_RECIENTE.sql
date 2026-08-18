-- Actualización consolidada para funciones recientes de producción.
-- Ejecutar UNA VEZ en phpMyAdmin sobre la base de datos hostel_management.
-- Las sentencias IF NOT EXISTS permiten ejecutarlo de forma segura si algunos campos ya existen.

-- Avisos de checkout enviados a los usuarios de Housekeeping.
ALTER TABLE `notifications`
  MODIFY COLUMN `type` ENUM('shift_assigned','shift_modified','shift_deleted','room_checkout','general') NOT NULL;

-- Configuración de OpenAI y ajustes globales.
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `settingKey` varchar(100) NOT NULL,
  `settingValue` text,
  `isEncrypted` boolean NOT NULL DEFAULT false,
  `description` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `app_settings_settingKey_unique` (`settingKey`)
);

-- Enlaces legales y guía de llegada bilingüe del Check-in Online.
ALTER TABLE `hostel_settings_checkin`
  ADD COLUMN IF NOT EXISTS `termsUrlEs` varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS `termsUrlEn` varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS `privacyUrlEs` varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS `privacyUrlEn` varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS `arrivalMapUrl` varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS `arrivalIntroEs` text NULL,
  ADD COLUMN IF NOT EXISTS `arrivalIntroEn` text NULL,
  ADD COLUMN IF NOT EXISTS `keyInstructionsEs` text NULL,
  ADD COLUMN IF NOT EXISTS `keyInstructionsEn` text NULL,
  ADD COLUMN IF NOT EXISTS `commonAreasEs` text NULL,
  ADD COLUMN IF NOT EXISTS `commonAreasEn` text NULL,
  ADD COLUMN IF NOT EXISTS `houseRulesEs` text NULL,
  ADD COLUMN IF NOT EXISTS `houseRulesEn` text NULL;

-- Asociación del nombre legal de una factura con el proveedor comercial.
ALTER TABLE `suppliers`
  ADD COLUMN IF NOT EXISTS `legalName` varchar(255) NULL AFTER `name`;

-- Perfil de tablet para registro policial restringido.
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('user','admin','housekeeping','tablet') NOT NULL DEFAULT 'user';

-- Enlaces seguros para Check-in Online.
CREATE TABLE IF NOT EXISTS `online_checkin_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token` varchar(128) NOT NULL,
  `status` enum('pending','completed','cancelled','expired') NOT NULL DEFAULT 'pending',
  `email` varchar(320) NOT NULL,
  `language` enum('es','en') NOT NULL DEFAULT 'es',
  `reservationNumber` varchar(100) DEFAULT NULL,
  `reservationOrigin` enum('Walk In','Booking.com','Airbnb','Expedia','Website','Phone','Email','Other') NOT NULL DEFAULT 'Website',
  `checkInDate` varchar(10) NOT NULL,
  `checkOutDate` varchar(10) NOT NULL,
  `roomNumber` varchar(10) NOT NULL,
  `roomType` varchar(100) DEFAULT NULL,
  `roomCode` varchar(20) DEFAULT NULL,
  `entranceCode` varchar(20) DEFAULT NULL,
  `numberOfRooms` int NOT NULL DEFAULT 1,
  `numberOfGuests` int NOT NULL DEFAULT 1,
  `paymentType` enum('EFECT','TARJT','TRANS','PLATF','MOVIL','TREG','DESTI','OTRO') NOT NULL DEFAULT 'TRANS',
  `amountPaid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amountPending` decimal(10,2) NOT NULL DEFAULT 0.00,
  `createdBy` int DEFAULT NULL,
  `guestId` int DEFAULT NULL,
  `expiresAt` varchar(10) NOT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `online_checkin_links_token_unique` (`token`)
);
