-- Script SQL CORREGIDO para actualizar estructura de tablas del sistema de Check-in
-- Este script renombra columnas existentes y agrega las faltantes
-- EJECUTAR EN phpMyAdmin de la base de datos de producción

-- =====================================================
-- PASO 1: Crear tabla guests (si no existe)
-- =====================================================
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
	`accommodationType` varchar(50) NOT NULL DEFAULT 'S.A. (Solo Aloj.)',
	`reservationOrigin` varchar(50) NOT NULL DEFAULT 'Walk In',
	`paymentType` varchar(10) NOT NULL DEFAULT 'TRANS',
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

-- =====================================================
-- PASO 2: Renombrar columnas de hostel_settings_checkin
-- =====================================================

-- Renombrar establishmentCode a policeCode
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `establishmentCode` `policeCode` varchar(50) NULL;

-- Renombrar establishmentName a hostelName
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `establishmentName` `hostelName` varchar(200) NULL;

-- Renombrar establishmentAddress a hostelAddress
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `establishmentAddress` `hostelAddress` varchar(255) NULL;

-- Renombrar establishmentCity a hostelPhone (reutilizamos esta columna)
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `establishmentCity` `hostelEmail` varchar(100) NULL;

-- Renombrar establishmentProvince a hostelWebsite (reutilizamos esta columna)
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `establishmentProvince` `hostelWebsite` varchar(100) NULL;

-- Renombrar establishmentPostalCode a hostelRta (reutilizamos esta columna)
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `establishmentPostalCode` `hostelRta` varchar(20) NULL;

-- Renombrar establishmentCountry a municipioCode (reutilizamos esta columna)
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `establishmentCountry` `municipioCode` varchar(3) NULL;

-- Renombrar establishmentPhone a hostelPhone
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `establishmentPhone` `hostelPhone` varchar(20) NULL;

-- Renombrar establishmentEmail a checkoutTime (reutilizamos esta columna)
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `establishmentEmail` `checkoutTime` varchar(320) NULL;

-- =====================================================
-- PASO 3: Agregar columnas faltantes
-- =====================================================

-- Agregar columnas que no existen en la estructura antigua
ALTER TABLE `hostel_settings_checkin` 
ADD COLUMN IF NOT EXISTS `hostelLogo` text NULL AFTER `municipioCode`,
ADD COLUMN IF NOT EXISTS `wifiPassword` varchar(255) NULL AFTER `hostelLogo`,
ADD COLUMN IF NOT EXISTS `defaultEntranceCode` varchar(10) NULL AFTER `checkoutTime`,
ADD COLUMN IF NOT EXISTS `welcomeMessageEs` text NULL AFTER `privacyPolicyEN`,
ADD COLUMN IF NOT EXISTS `welcomeMessageEn` text NULL AFTER `welcomeMessageEs`,
ADD COLUMN IF NOT EXISTS `roomTypes` text NULL AFTER `welcomeMessageEn`,
ADD COLUMN IF NOT EXISTS `smtpHost` varchar(255) NULL AFTER `roomTypes`,
ADD COLUMN IF NOT EXISTS `smtpPort` int NULL AFTER `smtpHost`,
ADD COLUMN IF NOT EXISTS `smtpUser` varchar(255) NULL AFTER `smtpPort`,
ADD COLUMN IF NOT EXISTS `smtpPassword` varchar(255) NULL AFTER `smtpUser`,
ADD COLUMN IF NOT EXISTS `smtpFromEmail` varchar(320) NULL AFTER `smtpPassword`,
ADD COLUMN IF NOT EXISTS `smtpFromName` varchar(255) NULL AFTER `smtpFromEmail`;

-- =====================================================
-- PASO 4: Actualizar datos existentes (si hay alguno)
-- =====================================================

-- Actualizar municipioCode a formato correcto (5 dígitos)
UPDATE `hostel_settings_checkin` 
SET `municipioCode` = '41091' 
WHERE `municipioCode` = 'ESP' OR `municipioCode` IS NULL;

-- Actualizar checkoutTime a formato correcto (HH:MM)
UPDATE `hostel_settings_checkin` 
SET `checkoutTime` = '11:00' 
WHERE `checkoutTime` NOT LIKE '%:%';

-- Actualizar hostelRta si está vacío
UPDATE `hostel_settings_checkin` 
SET `hostelRta` = 'H/SE/01189' 
WHERE `hostelRta` IS NULL OR `hostelRta` = '';

-- =====================================================
-- PASO 5: Verificación
-- =====================================================

-- Verificar que las tablas existen y tienen la estructura correcta
SELECT 'Tabla guests verificada' AS resultado 
FROM `guests` LIMIT 0;

SELECT 'Tabla hostel_settings_checkin verificada' AS resultado 
FROM `hostel_settings_checkin` LIMIT 0;

-- Mostrar configuración actual
SELECT 
    id,
    hostelName,
    policeCode,
    municipioCode,
    hostelRta,
    checkoutTime
FROM `hostel_settings_checkin` 
LIMIT 1;
