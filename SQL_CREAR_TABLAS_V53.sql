-- =====================================================
-- SQL para crear tablas access_codes y safe_boxes
-- Versión 53 - Módulos Cajas F y Códigos de Acceso
-- =====================================================

-- Tabla: access_codes (Códigos de Acceso a Habitaciones)
CREATE TABLE IF NOT EXISTS `access_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_number` varchar(10) NOT NULL COMMENT 'Número de habitación',
  `access_code` varchar(20) NOT NULL COMMENT 'Código de acceso de la habitación',
  `room_type_es` text COMMENT 'Tipo de habitación en español',
  `floor_es` varchar(50) COMMENT 'Planta en español',
  `floor_en` varchar(50) COMMENT 'Planta en inglés',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_number` (`room_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: safe_boxes (Cajas Fuertes - Movimientos)
CREATE TABLE IF NOT EXISTS `safe_boxes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL COMMENT '1=Hostel, 2=Tienda',
  `date` date NOT NULL COMMENT 'Fecha del movimiento',
  `type` varchar(100) NOT NULL COMMENT 'Tipología del movimiento',
  `concept` text NOT NULL COMMENT 'Concepto/descripción',
  `amount` decimal(10,2) NOT NULL COMMENT 'Cantidad en euros',
  `accumulated_total` decimal(10,2) NOT NULL COMMENT 'Total acumulado después del movimiento',
  `verification_status` varchar(20) DEFAULT 'pending' COMMENT 'pending, correct, incorrect',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  KEY `date` (`date`),
  CONSTRAINT `safe_boxes_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar código de entrada del hostel por defecto
INSERT INTO `access_codes` (`room_number`, `access_code`, `room_type_es`, `floor_es`, `floor_en`)
VALUES ('ENTRADA', '1469', 'Código de Entrada al Hostel', 'N/A', 'N/A')
ON DUPLICATE KEY UPDATE `access_code` = '1469';

-- =====================================================
-- Fin del script
-- =====================================================
