-- Agregar campo type a tabla otros_gastos
ALTER TABLE `otros_gastos` 
ADD COLUMN `type` enum('gasto','ingreso') NOT NULL DEFAULT 'gasto'
AFTER `businessId`;
