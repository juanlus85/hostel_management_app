-- Ejecutar una sola vez en phpMyAdmin/MySQL del VPS antes de desplegar.
ALTER TABLE `hostel_settings_checkin`
  ADD COLUMN IF NOT EXISTS `arrivalMapUrl` varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS `arrivalIntroEs` text NULL,
  ADD COLUMN IF NOT EXISTS `arrivalIntroEn` text NULL,
  ADD COLUMN IF NOT EXISTS `keyInstructionsEs` text NULL,
  ADD COLUMN IF NOT EXISTS `keyInstructionsEn` text NULL,
  ADD COLUMN IF NOT EXISTS `commonAreasEs` text NULL,
  ADD COLUMN IF NOT EXISTS `commonAreasEn` text NULL,
  ADD COLUMN IF NOT EXISTS `houseRulesEs` text NULL,
  ADD COLUMN IF NOT EXISTS `houseRulesEn` text NULL;
