-- Ejecutar una sola vez en MySQL del VPS antes de usar la sincronización de Loyverse.
-- No elimina productos ni pedidos existentes.

CREATE TABLE IF NOT EXISTS `loyverse_order_product_bindings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `templateKey` varchar(160) NOT NULL,
  `loyverseProductHandle` varchar(160) NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `loyverse_order_product_bindings_id` PRIMARY KEY (`id`),
  CONSTRAINT `loyverse_order_product_bindings_templateKey_unique` UNIQUE (`templateKey`)
);

ALTER TABLE `order_items`
  ADD COLUMN IF NOT EXISTS `loyverseProductHandle` varchar(160) NULL;

ALTER TABLE `order_items`
  ADD COLUMN IF NOT EXISTS `loyverseStockAtSelection` decimal(12,3) NULL;

ALTER TABLE `inventory_products`
  MODIFY COLUMN `handle` varchar(160) NULL;
