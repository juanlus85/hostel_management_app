-- Migración segura para la tabla guests.
-- Ejecutar en phpMyAdmin o MySQL sobre la base de datos de producción.
-- Es idempotente: comprueba cada columna e índice antes de crearla.
-- No elimina ni modifica datos existentes.

SET @schema_name = DATABASE();

-- documentExpiry
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'documentExpiry') = 0,
  'ALTER TABLE `guests` ADD COLUMN `documentExpiry` varchar(10) NULL',
  'SELECT ''documentExpiry ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- addressExtra
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'addressExtra') = 0,
  'ALTER TABLE `guests` ADD COLUMN `addressExtra` varchar(255) NULL',
  'SELECT ''addressExtra ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- phoneExtra
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'phoneExtra') = 0,
  'ALTER TABLE `guests` ADD COLUMN `phoneExtra` varchar(50) NULL',
  'SELECT ''phoneExtra ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- numberOfGuests
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'numberOfGuests') = 0,
  'ALTER TABLE `guests` ADD COLUMN `numberOfGuests` int NOT NULL DEFAULT 1',
  'SELECT ''numberOfGuests ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- acceptedTerms
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'acceptedTerms') = 0,
  'ALTER TABLE `guests` ADD COLUMN `acceptedTerms` boolean NOT NULL DEFAULT false',
  'SELECT ''acceptedTerms ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- acceptedPrivacy
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'acceptedPrivacy') = 0,
  'ALTER TABLE `guests` ADD COLUMN `acceptedPrivacy` boolean NOT NULL DEFAULT false',
  'SELECT ''acceptedPrivacy ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- isMainGuest
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'isMainGuest') = 0,
  'ALTER TABLE `guests` ADD COLUMN `isMainGuest` boolean NOT NULL DEFAULT true',
  'SELECT ''isMainGuest ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- groupId
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'groupId') = 0,
  'ALTER TABLE `guests` ADD COLUMN `groupId` varchar(100) NULL',
  'SELECT ''groupId ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- checkinType
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'checkinType') = 0,
  'ALTER TABLE `guests` ADD COLUMN `checkinType` enum(''presencial'',''anticipado'',''online'') NOT NULL DEFAULT ''presencial''',
  'SELECT ''checkinType ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- language
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'language') = 0,
  'ALTER TABLE `guests` ADD COLUMN `language` enum(''es'',''en'') NOT NULL DEFAULT ''es''',
  'SELECT ''language ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- token
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'token') = 0,
  'ALTER TABLE `guests` ADD COLUMN `token` varchar(255) NULL',
  'SELECT ''token ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- sendCodes
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'sendCodes') = 0,
  'ALTER TABLE `guests` ADD COLUMN `sendCodes` boolean NOT NULL DEFAULT false',
  'SELECT ''sendCodes ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- createdBy
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'createdBy') = 0,
  'ALTER TABLE `guests` ADD COLUMN `createdBy` int NULL',
  'SELECT ''createdBy ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

-- Índice único del token, solo si no existe.
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'guests' AND INDEX_NAME = 'guests_token_unique') = 0,
  'ALTER TABLE `guests` ADD UNIQUE KEY `guests_token_unique` (`token`)',
  'SELECT ''guests_token_unique ya existe'' AS mensaje'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SHOW COLUMNS FROM `guests`;
SELECT 'Migración de guests finalizada sin duplicar columnas.' AS mensaje;
