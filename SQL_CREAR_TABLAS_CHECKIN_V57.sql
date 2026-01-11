-- Script SQL para crear tablas faltantes del sistema de Check-in
-- Ejecutar en phpMyAdmin de la base de datos de producción

-- 1. Crear tabla guests (si no existe)
CREATE TABLE IF NOT EXISTS `guests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`documentNumber` varchar(50) NOT NULL,
	`documentSupport` varchar(50),
	`documentType` varchar(50) NOT NULL DEFAULT 'Passport',
	`gender` enum('Hombre','Mujer','Otro'),
	`nationality` varchar(100),
	`birthDate` varchar(10),
	`documentExpiry` varchar(10),
	`street` varchar(255),
	`addressExtra` varchar(255),
	`postalCode` varchar(20),
	`city` varchar(100),
	`province` varchar(100),
	`country` varchar(100),
	`phone` varchar(50),
	`phoneExtra` varchar(50),
	`email` varchar(320),
	`reservationNumber` varchar(100),
	`checkInDate` varchar(10),
	`checkOutDate` varchar(10),
	`roomNumber` varchar(10),
	`roomType` varchar(100),
	`roomCode` varchar(10),
	`entranceCode` varchar(10),
	`numberOfRooms` int NOT NULL DEFAULT 1,
	`hasInternet` boolean NOT NULL DEFAULT true,
	`accommodationType` enum('S.A. (Solo Aloj.)','A.D. (Aloj. y Desayuno)','M.P. (Media Pensión)','P.C. (Pensión Completa)') NOT NULL DEFAULT 'S.A. (Solo Aloj.)',
	`reservationOrigin` enum('Walk In','Booking.com','Airbnb','Expedia','Website','Phone','Email','Other') NOT NULL DEFAULT 'Walk In',
	`paymentType` enum('EFECT','TARJT','TRANS','PLATF','MOVIL','TREG','DESTI','OTRO') NOT NULL DEFAULT 'TRANS',
	`paymentDate` varchar(10),
	`amountPaid` decimal(10,2) NOT NULL DEFAULT '0',
	`amountPending` decimal(10,2) NOT NULL DEFAULT '0',
	`paymentHolder` varchar(255),
	`paymentMethod` varchar(255),
	`numberOfGuests` int NOT NULL DEFAULT 1,
	`signature` text,
	`acceptedTerms` boolean NOT NULL DEFAULT false,
	`acceptedPrivacy` boolean NOT NULL DEFAULT false,
	`isMainGuest` boolean NOT NULL DEFAULT true,
	`groupId` varchar(100),
	`status` enum('pending','completed','online','cancelled') NOT NULL DEFAULT 'pending',
	`checkinType` enum('presencial','anticipado','online') NOT NULL DEFAULT 'presencial',
	`language` enum('es','en') NOT NULL DEFAULT 'es',
	`token` varchar(255),
	`sendCodes` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `guests_id` PRIMARY KEY(`id`),
	CONSTRAINT `guests_token_unique` UNIQUE(`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Crear tabla hostel_settings_checkin (si no existe)
CREATE TABLE IF NOT EXISTS `hostel_settings_checkin` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hostelName` varchar(255),
	`hostelAddress` text,
	`hostelPhone` varchar(50),
	`hostelEmail` varchar(320),
	`hostelWebsite` varchar(255),
	`hostelRta` varchar(100),
	`policeCode` varchar(100),
	`municipioCode` varchar(5),
	`hostelLogo` text,
	`wifiPassword` varchar(255),
	`checkoutTime` varchar(5),
	`defaultEntranceCode` varchar(10),
	`termsConditionsEs` text,
	`termsConditionsEn` text,
	`privacyPolicyEs` text,
	`privacyPolicyEn` text,
	`welcomeMessageEs` text,
	`welcomeMessageEn` text,
	`roomTypes` text,
	`smtpHost` varchar(255),
	`smtpPort` int,
	`smtpUser` varchar(255),
	`smtpPassword` varchar(255),
	`smtpFromEmail` varchar(320),
	`smtpFromName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hostel_settings_checkin_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Insertar configuración inicial (si la tabla está vacía)
INSERT INTO `hostel_settings_checkin` (
	`hostelName`,
	`hostelAddress`,
	`hostelPhone`,
	`hostelEmail`,
	`hostelWebsite`,
	`hostelRta`,
	`policeCode`,
	`municipioCode`,
	`checkoutTime`,
	`termsConditionsEs`,
	`termsConditionsEn`
) VALUES (
	'The Spot Central Hostel',
	'Calle Principal, Sevilla',
	'+34 XXX XXX XXX',
	'thespotcentralhostel@gmail.com',
	'https://thespotcentralhostel.com',
	'H/SE/01189',
	'CODIGO_ESTABLECIMIENTO', -- CAMBIAR por el código real
	'41091', -- Código INE de Sevilla
	'11:00',
	'Los huéspedes manifiestan que han leído, conocen y se comprometen a cumplir las normas y condiciones del establecimiento.',
	'The guests state that they have read, know, undertake and agree to comply with the rules and conditions of the establishment.'
) ON DUPLICATE KEY UPDATE id=id;

-- 4. Verificar que las tablas se crearon correctamente
SELECT 'Tabla guests creada correctamente' AS resultado FROM `guests` LIMIT 0;
SELECT 'Tabla hostel_settings_checkin creada correctamente' AS resultado FROM `hostel_settings_checkin` LIMIT 0;
SELECT 'Configuración inicial insertada' AS resultado FROM `hostel_settings_checkin` WHERE id = 1;
