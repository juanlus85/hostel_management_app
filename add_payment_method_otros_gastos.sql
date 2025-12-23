-- Agregar campo paymentMethod a tabla otros_gastos
ALTER TABLE `otros_gastos` 
ADD COLUMN `paymentMethod` enum('cuenta_bancaria','tarjeta','ana','juanlu','caja_hostel','caja_tienda','caja_fuerte','caja_fuerte_cambio','otros') DEFAULT NULL
AFTER `importe`;
