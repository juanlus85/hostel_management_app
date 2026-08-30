CREATE TABLE `loyverse_order_product_bindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateKey` varchar(160) NOT NULL,
	`loyverseProductHandle` varchar(160),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyverse_order_product_bindings_id` PRIMARY KEY(`id`),
	CONSTRAINT `loyverse_order_product_bindings_templateKey_unique` UNIQUE(`templateKey`)
);
--> statement-breakpoint
ALTER TABLE `order_items` ADD `loyverseProductHandle` varchar(160);--> statement-breakpoint
ALTER TABLE `order_items` ADD `loyverseStockAtSelection` decimal(12,3);