-- =====================================================
-- SQL para Resumen Semanal Mejorado (v55)
-- Control de efectivo en sobres + disponibilidad semanal
-- =====================================================

-- Tabla: weekly_cash_envelopes (Efectivo en sobres por día)
CREATE TABLE IF NOT EXISTS `weekly_cash_envelopes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `weekStart` varchar(10) NOT NULL COMMENT 'Lunes de la semana YYYY-MM-DD',
  `dayOfWeek` int NOT NULL COMMENT '1=Lunes, 2=Martes, ..., 7=Domingo',
  `expectedCash` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Lo que debería haber',
  `actualCash` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Lo que había',
  `difference` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Desfase (actualCash - expectedCash)',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `weekStart` (`weekStart`),
  KEY `dayOfWeek` (`dayOfWeek`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: weekly_availability_sources (Fuentes de disponibilidad)
CREATE TABLE IF NOT EXISTS `weekly_availability_sources` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Nombre de la fuente',
  `type` enum('bank','cash_register','safe') NOT NULL COMMENT 'Tipo de fuente',
  `isActive` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Activa o no',
  `displayOrder` int NOT NULL DEFAULT '0' COMMENT 'Orden de visualización',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: weekly_availability_records (Registros de disponibilidad por semana)
CREATE TABLE IF NOT EXISTS `weekly_availability_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `weekStart` varchar(10) NOT NULL COMMENT 'Lunes de la semana YYYY-MM-DD',
  `sourceId` int NOT NULL COMMENT 'Referencia a weekly_availability_sources',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Cantidad disponible',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `weekStart` (`weekStart`),
  KEY `sourceId` (`sourceId`),
  CONSTRAINT `weekly_availability_records_ibfk_1` FOREIGN KEY (`sourceId`) REFERENCES `weekly_availability_sources` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar fuentes predefinidas
INSERT INTO `weekly_availability_sources` (`name`, `type`, `displayOrder`) VALUES
('BBVA', 'bank', 1),
('Santander', 'bank', 2),
('Unicaja', 'bank', 3),
('MyInvestor', 'bank', 4),
('C.F. Hostel', 'safe', 5),
('C.F. Tienda', 'safe', 6),
('Caja Hostel', 'cash_register', 7),
('Caja Tienda', 'cash_register', 8);

-- =====================================================
-- Fin del script
-- =====================================================
