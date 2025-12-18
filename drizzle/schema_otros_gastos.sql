-- Crear tabla otros_gastos para gastos no facturados (sueldos, seguros, impuestos, etc.)
CREATE TABLE IF NOT EXISTS otros_gastos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  businessId INT NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  categoria ENUM('sueldos', 'seguridad_social', 'impuestos', 'seguros', 'otros') NOT NULL DEFAULT 'otros',
  categoriaOtros VARCHAR(255) NULL,
  importe DECIMAL(10, 2) NOT NULL,
  fecha VARCHAR(10) NOT NULL COMMENT 'YYYY-MM-DD format',
  notas TEXT NULL,
  createdBy INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_businessId (businessId),
  INDEX idx_fecha (fecha),
  INDEX idx_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
