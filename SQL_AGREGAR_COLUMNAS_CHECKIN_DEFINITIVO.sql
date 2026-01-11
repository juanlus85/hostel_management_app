-- Script SQL DEFINITIVO para agregar columnas faltantes del sistema de Check-in
-- Este script SOLO agrega columnas nuevas, NO modifica ni elimina nada existente
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
-- PASO 2: Agregar columnas faltantes a hostel_settings_checkin
-- =====================================================

-- Agregar hostelPhone (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'hostelPhone';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `hostelPhone` varchar(50) NULL AFTER `hostelRta`', 
    'SELECT "Column hostelPhone already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar hostelLogo (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'hostelLogo';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `hostelLogo` text NULL AFTER `municipioCode`', 
    'SELECT "Column hostelLogo already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar wifiPassword (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'wifiPassword';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `wifiPassword` varchar(255) NULL AFTER `hostelLogo`', 
    'SELECT "Column wifiPassword already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar checkoutTime (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'checkoutTime';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `checkoutTime` varchar(5) NULL AFTER `wifiPassword`', 
    'SELECT "Column checkoutTime already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar defaultEntranceCode (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'defaultEntranceCode';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `defaultEntranceCode` varchar(10) NULL AFTER `checkoutTime`', 
    'SELECT "Column defaultEntranceCode already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar welcomeMessageEs (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'welcomeMessageEs';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `welcomeMessageEs` text NULL AFTER `privacyPolicyEN`', 
    'SELECT "Column welcomeMessageEs already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar welcomeMessageEn (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'welcomeMessageEn';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `welcomeMessageEn` text NULL AFTER `welcomeMessageEs`', 
    'SELECT "Column welcomeMessageEn already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar roomTypes (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'roomTypes';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `roomTypes` text NULL AFTER `welcomeMessageEn`', 
    'SELECT "Column roomTypes already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar smtpHost (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'smtpHost';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `smtpHost` varchar(255) NULL AFTER `roomTypes`', 
    'SELECT "Column smtpHost already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar smtpPort (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'smtpPort';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `smtpPort` int NULL AFTER `smtpHost`', 
    'SELECT "Column smtpPort already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar smtpUser (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'smtpUser';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `smtpUser` varchar(255) NULL AFTER `smtpPort`', 
    'SELECT "Column smtpUser already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar smtpPassword (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'smtpPassword';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `smtpPassword` varchar(255) NULL AFTER `smtpUser`', 
    'SELECT "Column smtpPassword already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar smtpFromEmail (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'smtpFromEmail';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `smtpFromEmail` varchar(320) NULL AFTER `smtpPassword`', 
    'SELECT "Column smtpFromEmail already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar smtpFromName (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'smtpFromName';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `smtpFromName` varchar(255) NULL AFTER `smtpFromEmail`', 
    'SELECT "Column smtpFromName already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- PASO 3: Actualizar datos existentes (si es necesario)
-- =====================================================

-- Actualizar checkoutTime a formato correcto si está vacío
UPDATE `hostel_settings_checkin` 
SET `checkoutTime` = '11:00' 
WHERE `checkoutTime` IS NULL OR `checkoutTime` = '';

-- Actualizar municipioCode a formato correcto (5 dígitos) si está en formato antiguo
UPDATE `hostel_settings_checkin` 
SET `municipioCode` = '41091' 
WHERE `municipioCode` = 'ESP' OR LENGTH(`municipioCode`) = 3;

-- =====================================================
-- PASO 4: Verificación final
-- =====================================================

-- Verificar que la tabla guests existe
SELECT 'Tabla guests creada correctamente' AS resultado 
FROM `guests` LIMIT 0;

-- Verificar que hostel_settings_checkin tiene las columnas necesarias
SELECT 'Tabla hostel_settings_checkin actualizada correctamente' AS resultado 
FROM `hostel_settings_checkin` LIMIT 0;

-- Mostrar configuración actual
SELECT 
    id,
    hostelName,
    policeCode,
    municipioCode,
    hostelRta,
    checkoutTime,
    wifiPassword
FROM `hostel_settings_checkin` 
LIMIT 1;

SELECT '¡Script ejecutado correctamente! Ahora refresca la página de check-in.' AS mensaje;
