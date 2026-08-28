-- Ejecutar una sola vez en la base de datos de producción antes de usar
-- los envíos de Check-in Online desde Próximas reservas.
-- No elimina ni modifica datos existentes.

ALTER TABLE `online_checkin_links`
  ADD COLUMN IF NOT EXISTS `prefilledFirstName` varchar(120) NULL;

ALTER TABLE `online_checkin_links`
  ADD COLUMN IF NOT EXISTS `prefilledLastName` varchar(160) NULL;

ALTER TABLE `online_checkin_links`
  ADD COLUMN IF NOT EXISTS `prefilledPhone` varchar(80) NULL;
