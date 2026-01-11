-- Script SQL FINAL para renombrar columnas de hostel_settings_checkin
-- Este script corrige los nombres de columnas para que coincidan con el código
-- EJECUTAR EN phpMyAdmin

-- =====================================================
-- PASO 1: Renombrar columnas con nombres incorrectos
-- =====================================================

-- Renombrar termsAndConditionsES a termsConditionsEs
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `termsAndConditionsES` `termsConditionsEs` text NULL;

-- Renombrar termsAndConditionsEN a termsConditionsEn
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `termsAndConditionsEN` `termsConditionsEn` text NULL;

-- Renombrar privacyPolicyES a privacyPolicyEs
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `privacyPolicyES` `privacyPolicyEs` text NULL;

-- Renombrar privacyPolicyEN a privacyPolicyEn
ALTER TABLE `hostel_settings_checkin` 
CHANGE COLUMN `privacyPolicyEN` `privacyPolicyEn` text NULL;

-- =====================================================
-- PASO 2: Eliminar columnas duplicadas
-- =====================================================

-- Eliminar establishmentCountry (ya existe municipioCode)
ALTER TABLE `hostel_settings_checkin` 
DROP COLUMN `establishmentCountry`;

-- Eliminar establishmentPhone (ya existe hostelPhone)
ALTER TABLE `hostel_settings_checkin` 
DROP COLUMN `establishmentPhone`;

-- Eliminar establishmentEmail (ya existe hostelEmail)
ALTER TABLE `hostel_settings_checkin` 
DROP COLUMN `establishmentEmail`;

-- =====================================================
-- PASO 3: Agregar columnas faltantes (si no existen)
-- =====================================================

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

-- Agregar createdAt (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'createdAt';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP', 
    'SELECT "Column createdAt already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar updatedAt (si no existe)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'hostel_settings_checkin' 
AND COLUMN_NAME = 'updatedAt';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `hostel_settings_checkin` ADD COLUMN `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 
    'SELECT "Column updatedAt already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- PASO 4: Insertar configuración inicial (si no existe)
-- =====================================================

INSERT INTO `hostel_settings_checkin` (
    `policeCode`,
    `hostelName`,
    `hostelAddress`,
    `hostelEmail`,
    `hostelWebsite`,
    `hostelRta`,
    `municipioCode`,
    `hostelPhone`,
    `checkoutTime`,
    `termsConditionsEs`,
    `termsConditionsEn`,
    `privacyPolicyEs`,
    `privacyPolicyEn`,
    `welcomeMessageEs`,
    `welcomeMessageEn`
) 
SELECT * FROM (SELECT
    'CODIGO_ESTABLECIMIENTO' AS policeCode,
    'The Spot Central Hostel' AS hostelName,
    'Calle Principal, Sevilla' AS hostelAddress,
    'thespotcentralhostel@gmail.com' AS hostelEmail,
    'https://thespotcentralhostel.com' AS hostelWebsite,
    'H/SE/01189' AS hostelRta,
    '41091' AS municipioCode,
    '+34 XXX XXX XXX' AS hostelPhone,
    '11:00' AS checkoutTime,
    'Los huéspedes manifiestan que han leído, conocen y se comprometen a cumplir las normas y condiciones del establecimiento. Éstas se encuentran a disposición del huésped, expuestas en la recepción del establecimiento.' AS termsConditionsEs,
    'The guests state that they have read, know, undertake and agree to comply with the rules and conditions of the establishment. These are available to the guests, displayed at the reception of the establishment.' AS termsConditionsEn,
    'Política de privacidad del establecimiento.' AS privacyPolicyEs,
    'Privacy policy of the establishment.' AS privacyPolicyEn,
    'Welcome to our Home' AS welcomeMessageEs,
    'Welcome to our Home' AS welcomeMessageEn
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM hostel_settings_checkin LIMIT 1
) LIMIT 1;

-- =====================================================
-- PASO 5: Verificación final
-- =====================================================

-- Mostrar estructura actualizada
SHOW COLUMNS FROM hostel_settings_checkin;

-- Mostrar configuración actual
SELECT 
    id,
    hostelName,
    policeCode,
    municipioCode,
    hostelRta,
    checkoutTime
FROM hostel_settings_checkin 
LIMIT 1;

SELECT '¡Script ejecutado correctamente! Ahora refresca la página de check-in.' AS mensaje;
