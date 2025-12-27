-- Script SQL para crear tabla app_settings (v57)
-- Ejecutar en phpMyAdmin o consola MySQL

CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `settingKey` VARCHAR(100) NOT NULL UNIQUE,
  `settingValue` TEXT,
  `isEncrypted` BOOLEAN NOT NULL DEFAULT FALSE,
  `description` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índice para búsquedas rápidas por clave
CREATE INDEX idx_setting_key ON `app_settings`(`settingKey`);
