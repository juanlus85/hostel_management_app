-- Añade el modo de Check-in a los enlaces existentes sin modificar los enlaces ya creados.
-- MySQL 8+ / MariaDB compatible.
SET @schema_name := DATABASE();
SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'online_checkin_links'
    AND COLUMN_NAME = 'checkinMode'
);
SET @statement := IF(
  @column_exists = 0,
  'ALTER TABLE `online_checkin_links` ADD COLUMN `checkinMode` ENUM(\'access\',\'early\') NOT NULL DEFAULT \'access\' AFTER `token`',
  'SELECT \'La columna checkinMode ya existe\' AS result'
);
PREPARE checkin_mode_statement FROM @statement;
EXECUTE checkin_mode_statement;
DEALLOCATE PREPARE checkin_mode_statement;
