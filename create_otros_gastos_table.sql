-- Crear tabla otros_gastos en producción
CREATE TABLE IF NOT EXISTS `otros_gastos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `concepto` text NOT NULL,
  `categoria` enum('sueldos','seguridad_social','impuestos','seguros','otros') NOT NULL DEFAULT 'otros',
  `categoria_otros` text,
  `importe` text NOT NULL,
  `fecha` date NOT NULL,
  `notas` text,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
