-- Migration v79: Histórico de Cajas
-- Ejecutar este SQL en tu base de datos MySQL/TiDB

-- 1. Crear tabla historical_cash_data
CREATE TABLE IF NOT EXISTS `historical_cash_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `businessType` enum('hostel','tienda') NOT NULL,
  `totalZ` decimal(10,2) NOT NULL DEFAULT '0.00',
  `totalCash` decimal(10,2) NOT NULL DEFAULT '0.00',
  `totalCards` decimal(10,2) NOT NULL DEFAULT '0.00',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `year_month_business_unique` (`year`,`month`,`businessType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Verificar que la tabla se creó correctamente
SELECT 'Tabla historical_cash_data creada correctamente' as status;

-- 3. Después de ejecutar este archivo, ejecuta historical_data_import.sql para importar los datos históricos
