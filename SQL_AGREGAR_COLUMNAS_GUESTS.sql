-- Script SQL para agregar columnas faltantes a la tabla guests
-- Este script agrega las columnas que el código espera pero no existen en producción
-- EJECUTAR EN phpMyAdmin

-- =====================================================
-- Agregar columnas faltantes a tabla guests
-- =====================================================

-- documentExpiry (fecha de expiración del documento)
ALTER TABLE `guests` 
ADD COLUMN `documentExpiry` varchar(10) NULL AFTER `birthDate`;

-- addressExtra (información adicional de dirección)
ALTER TABLE `guests` 
ADD COLUMN `addressExtra` varchar(255) NULL AFTER `street`;

-- phoneExtra (teléfono adicional)
ALTER TABLE `guests` 
ADD COLUMN `phoneExtra` varchar(50) NULL AFTER `phone`;

-- numberOfGuests (número de huéspedes en la reserva)
ALTER TABLE `guests` 
ADD COLUMN `numberOfGuests` int NOT NULL DEFAULT 1 AFTER `paymentMethod`;

-- acceptedTerms (aceptó términos y condiciones)
ALTER TABLE `guests` 
ADD COLUMN `acceptedTerms` boolean NOT NULL DEFAULT false AFTER `signature`;

-- acceptedPrivacy (aceptó política de privacidad)
ALTER TABLE `guests` 
ADD COLUMN `acceptedPrivacy` boolean NOT NULL DEFAULT false AFTER `acceptedTerms`;

-- isMainGuest (es el huésped principal del grupo)
ALTER TABLE `guests` 
ADD COLUMN `isMainGuest` boolean NOT NULL DEFAULT true AFTER `acceptedPrivacy`;

-- groupId (ID del grupo de huéspedes)
ALTER TABLE `guests` 
ADD COLUMN `groupId` varchar(100) NULL AFTER `isMainGuest`;

-- checkinType (tipo de check-in: presencial, anticipado, online)
ALTER TABLE `guests` 
ADD COLUMN `checkinType` enum('presencial','anticipado','online') NOT NULL DEFAULT 'presencial' AFTER `status`;

-- language (idioma del huésped: es, en)
ALTER TABLE `guests` 
ADD COLUMN `language` enum('es','en') NOT NULL DEFAULT 'es' AFTER `checkinType`;

-- token (token único para check-in online/anticipado)
ALTER TABLE `guests` 
ADD COLUMN `token` varchar(255) NULL AFTER `language`,
ADD UNIQUE KEY `guests_token_unique` (`token`);

-- sendCodes (enviar códigos de acceso por email)
ALTER TABLE `guests` 
ADD COLUMN `sendCodes` boolean NOT NULL DEFAULT false AFTER `token`;

-- createdBy (ID del usuario que creó el registro)
ALTER TABLE `guests` 
ADD COLUMN `createdBy` int NULL AFTER `updatedAt`;

-- =====================================================
-- Verificación
-- =====================================================

-- Mostrar estructura actualizada
SHOW COLUMNS FROM guests;

SELECT '¡Columnas agregadas correctamente! Ahora refresca las páginas de Huéspedes, Anticipado y Policía.' AS mensaje;
