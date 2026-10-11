-- Compatibilidad para instalaciones existentes.
-- Añade las columnas que requiere el módulo Otros Gastos/Ingresos sin modificar datos ya guardados.
SET @schema_name = DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'otros_gastos' AND column_name = 'type') = 0,
  'ALTER TABLE `otros_gastos` ADD COLUMN `type` enum(''gasto'', ''ingreso'') NOT NULL DEFAULT ''gasto'' AFTER `businessId`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'otros_gastos' AND column_name = 'paymentMethod') = 0,
  'ALTER TABLE `otros_gastos` ADD COLUMN `paymentMethod` enum(''cuenta_bancaria'', ''tarjeta'', ''ana'', ''juanlu'', ''caja_hostel'', ''caja_tienda'', ''caja_fuerte'', ''caja_fuerte_cambio'', ''otros'') NULL AFTER `importe`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
