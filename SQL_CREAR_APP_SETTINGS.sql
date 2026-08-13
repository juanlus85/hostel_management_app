-- Ejecutar solo si la pantalla Configuración muestra que falta la tabla app_settings.
-- Compatible con MySQL/MariaDB en Plesk.
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
