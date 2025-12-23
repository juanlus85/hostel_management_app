-- =====================================================
-- SQL CORREGIDO para tablas access_codes y safe_boxes
-- Versión 54 - Nombres de columnas exactos del schema
-- =====================================================

-- IMPORTANTE: Si ya creaste las tablas con el SQL anterior, 
-- primero elimínalas y vuelve a crearlas con este script correcto

-- Eliminar tablas si existen (para empezar limpio)
DROP TABLE IF EXISTS `safe_boxes`;
DROP TABLE IF EXISTS `access_codes`;

-- =====================================================
-- Tabla: access_codes (Códigos de Acceso a Habitaciones)
-- =====================================================
CREATE TABLE `access_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roomNumber` varchar(10) NOT NULL COMMENT 'Número de habitación o ENTRADA',
  `roomCode` varchar(10) NOT NULL COMMENT 'Código de acceso',
  `roomType` varchar(255) NOT NULL COMMENT 'Tipo de habitación en español',
  `floor` varchar(50) NOT NULL COMMENT 'Planta en español',
  `floorLevel` varchar(50) NOT NULL COMMENT 'Floor en inglés',
  `entranceCode` varchar(10) DEFAULT NULL COMMENT 'Código de entrada (legacy, no se usa)',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roomNumber` (`roomNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Tabla: safe_boxes (Cajas Fuertes - Movimientos)
-- =====================================================
CREATE TABLE `safe_boxes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessId` int NOT NULL COMMENT '1=Hostel, 2=Tienda',
  `date` varchar(10) NOT NULL COMMENT 'Fecha YYYY-MM-DD',
  `type` enum(
    'entrada_efectivo_caja',
    'salida_efectivo_cambio',
    'entrada_salida_bbva',
    'descuadres',
    'sueldos',
    'pago_proveedor',
    'ajuste',
    'caja_semana',
    'es_efectivo_cf_hostel',
    'es_efectivo_cf_tienda'
  ) NOT NULL COMMENT 'Tipología del movimiento',
  `concept` varchar(255) DEFAULT NULL COMMENT 'Concepto/descripción',
  `amount` decimal(10,2) NOT NULL COMMENT 'Cantidad (positivo=entrada, negativo=salida)',
  `accumulated` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Total acumulado',
  `checkStatus` enum('unchecked','correct','incorrect') NOT NULL DEFAULT 'unchecked' COMMENT 'Estado de verificación',
  `createdBy` int DEFAULT NULL COMMENT 'ID del usuario que creó',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `businessId` (`businessId`),
  KEY `date` (`date`),
  CONSTRAINT `safe_boxes_ibfk_1` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Insertar código de entrada del hostel por defecto
-- =====================================================
INSERT INTO `access_codes` (`roomNumber`, `roomCode`, `roomType`, `floor`, `floorLevel`)
VALUES ('ENTRADA', '1469', 'Código de Entrada al Hostel', 'N/A', 'N/A');

-- =====================================================
-- Fin del script
-- =====================================================
