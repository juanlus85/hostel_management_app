DROP TABLE `access_codes`;--> statement-breakpoint
DROP TABLE `app_settings`;--> statement-breakpoint
DROP TABLE `businesses`;--> statement-breakpoint
DROP TABLE `cash_closings`;--> statement-breakpoint
DROP TABLE `cash_movements`;--> statement-breakpoint
DROP TABLE `cash_registers`;--> statement-breakpoint
DROP TABLE `incidents`;--> statement-breakpoint
DROP TABLE `inventory_items`;--> statement-breakpoint
DROP TABLE `invoices`;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
DROP TABLE `order_items`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
DROP TABLE `otros_gastos`;--> statement-breakpoint
DROP TABLE `room_status`;--> statement-breakpoint
DROP TABLE `safe_boxes`;--> statement-breakpoint
DROP TABLE `shift_templates`;--> statement-breakpoint
DROP TABLE `shifts`;--> statement-breakpoint
DROP TABLE `stock_movements`;--> statement-breakpoint
DROP TABLE `suppliers`;--> statement-breakpoint
DROP TABLE `system_settings`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
DROP TABLE `weekly_availability_records`;--> statement-breakpoint
DROP TABLE `weekly_availability_sources`;--> statement-breakpoint
DROP TABLE `weekly_cash_envelopes`;--> statement-breakpoint
DROP TABLE `weekly_summaries`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `username`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `passwordHash`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `pin`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `color`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `isActive`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `scheduleTemplate`;