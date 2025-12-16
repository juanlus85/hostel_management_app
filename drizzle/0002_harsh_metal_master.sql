ALTER TABLE `cash_registers` MODIFY COLUMN `date` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `invoiceDate` varchar(10);--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `orderDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `expectedDelivery` varchar(10);--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `actualDelivery` varchar(10);--> statement-breakpoint
ALTER TABLE `shifts` MODIFY COLUMN `scheduledDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `dueDate` varchar(10);--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `date` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_summaries` MODIFY COLUMN `weekStart` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_summaries` MODIFY COLUMN `weekEnd` varchar(10) NOT NULL;