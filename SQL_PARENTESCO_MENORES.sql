-- Añade el parentesco para huéspedes menores de edad.
-- Seguro para volver a ejecutar en MySQL/MariaDB: no modifica registros existentes.
ALTER TABLE `guests`
  ADD COLUMN IF NOT EXISTS `relationship` varchar(2) NULL AFTER `documentExpiry`;
