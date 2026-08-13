-- Ejecutar una única vez en phpMyAdmin sobre la base de datos de producción.
-- Es seguro volver a ejecutarlo: no modifica ni elimina datos existentes.
ALTER TABLE `hostel_settings_checkin` ADD COLUMN IF NOT EXISTS `termsUrlEs` varchar(500) NULL;
ALTER TABLE `hostel_settings_checkin` ADD COLUMN IF NOT EXISTS `termsUrlEn` varchar(500) NULL;
ALTER TABLE `hostel_settings_checkin` ADD COLUMN IF NOT EXISTS `privacyUrlEs` varchar(500) NULL;
ALTER TABLE `hostel_settings_checkin` ADD COLUMN IF NOT EXISTS `privacyUrlEn` varchar(500) NULL;
