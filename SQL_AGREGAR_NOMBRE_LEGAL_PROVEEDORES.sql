-- Añade la razón social opcional de cada proveedor.
-- Ejecutar una sola vez en phpMyAdmin sobre la base de datos de producción.
ALTER TABLE `suppliers`
  ADD COLUMN IF NOT EXISTS `legalName` varchar(255) NULL AFTER `name`;
