CREATE TABLE `access_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomNumber` varchar(10) NOT NULL,
	`roomCode` varchar(10) NOT NULL,
	`roomType` varchar(255) NOT NULL,
	`floor` varchar(50) NOT NULL,
	`floorLevel` varchar(50) NOT NULL,
	`entranceCode` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `access_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_codes_roomNumber_unique` UNIQUE(`roomNumber`)
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text,
	`isEncrypted` boolean NOT NULL DEFAULT false,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(20) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `businesses_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `cash_closings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`coins010` int NOT NULL DEFAULT 0,
	`coins020` int NOT NULL DEFAULT 0,
	`coins050` int NOT NULL DEFAULT 0,
	`coins100` int NOT NULL DEFAULT 0,
	`coins200` int NOT NULL DEFAULT 0,
	`bills5` int NOT NULL DEFAULT 0,
	`bills10` int NOT NULL DEFAULT 0,
	`bills20` int NOT NULL DEFAULT 0,
	`bills50` int NOT NULL DEFAULT 0,
	`totalCash` decimal(10,2) NOT NULL DEFAULT '0',
	`totalCards` decimal(10,2) NOT NULL DEFAULT '0',
	`zReading` decimal(10,2) NOT NULL DEFAULT '0',
	`previousChange` decimal(10,2) NOT NULL DEFAULT '0',
	`prepaidBooking` decimal(10,2) NOT NULL DEFAULT '0',
	`withdrawnCash` decimal(10,2) NOT NULL DEFAULT '0',
	`withdrawnCards` decimal(10,2) NOT NULL DEFAULT '0',
	`expectedTotal` decimal(10,2) NOT NULL DEFAULT '0',
	`actualTotal` decimal(10,2) NOT NULL DEFAULT '0',
	`difference` decimal(10,2) NOT NULL DEFAULT '0',
	`changeForNextDay` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`status` enum('draft','closed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cash_closings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cashClosingId` int NOT NULL,
	`type` enum('in','out') NOT NULL,
	`description` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cash_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_registers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`shiftId` int,
	`date` varchar(10) NOT NULL,
	`openingAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`closingAmount` decimal(10,2),
	`expectedAmount` decimal(10,2),
	`difference` decimal(10,2),
	`cashWithdrawn` decimal(10,2) NOT NULL DEFAULT '0',
	`cardWithdrawn` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cash_registers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`resolvedAt` timestamp,
	`resolvedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`supplier` varchar(255),
	`currentStock` decimal(10,2) NOT NULL DEFAULT '0',
	`minimumStock` decimal(10,2) NOT NULL DEFAULT '0',
	`unit` varchar(50) NOT NULL DEFAULT 'unidad',
	`costPrice` decimal(10,2),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`transactionId` int,
	`supplier` varchar(255),
	`invoiceNumber` varchar(100),
	`invoiceDate` varchar(10),
	`baseAmount` decimal(10,2),
	`vatRate` decimal(5,2),
	`vatAmount` decimal(10,2),
	`totalAmount` decimal(10,2),
	`paymentMethodInvoice` enum('cuenta_bancaria','tarjeta','ana','juanlu','caja_hostel','caja_tienda','caja_fuerte','caja_fuerte_cambio','otros') DEFAULT 'cuenta_bancaria',
	`imageUrl` text,
	`imageKey` varchar(255),
	`ocrData` text,
	`ocrStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`isVerified` boolean NOT NULL DEFAULT false,
	`isScanned` boolean NOT NULL DEFAULT false,
	`hasVAT` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('shift_assigned','shift_modified','shift_deleted','general') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`relatedShiftId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`inventoryItemId` int,
	`itemName` varchar(255) NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`unitPrice` decimal(10,2),
	`totalPrice` decimal(10,2),
	`received` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`supplier` varchar(255),
	`orderDate` varchar(10) NOT NULL,
	`expectedDelivery` varchar(10),
	`actualDelivery` varchar(10),
	`status` enum('pending','ordered','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`totalAmount` decimal(10,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otros_gastos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`type` enum('gasto','ingreso') NOT NULL DEFAULT 'gasto',
	`concepto` varchar(255) NOT NULL,
	`categoria` enum('sueldos','seguridad_social','impuestos','seguros','otros') NOT NULL DEFAULT 'otros',
	`categoriaOtros` varchar(255),
	`importe` decimal(10,2) NOT NULL,
	`paymentMethod` enum('cuenta_bancaria','tarjeta','ana','juanlu','caja_hostel','caja_tienda','caja_fuerte','caja_fuerte_cambio','otros'),
	`fecha` varchar(10) NOT NULL,
	`notas` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otros_gastos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `room_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomNumber` varchar(10) NOT NULL,
	`date` varchar(10) NOT NULL,
	`status` enum('checkout','continues','empty','ready') NOT NULL,
	`beds` int,
	`notes` text,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `room_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `safe_boxes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`type` enum('entrada_efectivo_caja','salida_efectivo_cambio','entrada_salida_bbva','descuadres','sueldos','pago_proveedor','ajuste','caja_semana','es_efectivo_cf_hostel','es_efectivo_cf_tienda') NOT NULL,
	`concept` varchar(255),
	`amount` decimal(10,2) NOT NULL,
	`accumulated` decimal(10,2) NOT NULL DEFAULT '0',
	`checkStatus` enum('unchecked','correct','incorrect') NOT NULL DEFAULT 'unchecked',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `safe_boxes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`dayOfWeek` int NOT NULL,
	`userId` int NOT NULL,
	`scheduledStart` varchar(5) NOT NULL,
	`scheduledEnd` varchar(5) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shift_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scheduledDate` varchar(10) NOT NULL,
	`scheduledStart` varchar(5) NOT NULL,
	`scheduledEnd` varchar(5) NOT NULL,
	`actualStart` timestamp,
	`actualEnd` timestamp,
	`hoursWorked` decimal(5,2),
	`notes` text,
	`status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryItemId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('in','out','adjustment') NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`previousStock` decimal(10,2) NOT NULL,
	`newStock` decimal(10,2) NOT NULL,
	`reason` varchar(255),
	`orderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactName` varchar(255),
	`phone` varchar(50),
	`email` varchar(320),
	`address` text,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`description` varchar(255),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int,
	`createdBy` int NOT NULL,
	`assignedTo` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`dueDate` varchar(10),
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`cashRegisterId` int,
	`userId` int NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`category` varchar(100),
	`concept` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`paymentMethod` enum('cash','card','transfer','cuenta_bancaria','ana','juanlu','caja_hostel','caja_tienda','caja_fuerte','caja_fuerte_cambio','other') NOT NULL DEFAULT 'cash',
	`date` varchar(10) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_availability_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weekStart` varchar(10) NOT NULL,
	`sourceId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_availability_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_availability_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('bank','cash_register','safe') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_availability_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_cash_envelopes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weekStart` varchar(10) NOT NULL,
	`dayOfWeek` int NOT NULL,
	`expectedCash` decimal(10,2) NOT NULL DEFAULT '0',
	`actualCash` decimal(10,2) NOT NULL DEFAULT '0',
	`difference` decimal(10,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_cash_envelopes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`weekStart` varchar(10) NOT NULL,
	`weekEnd` varchar(10) NOT NULL,
	`totalIncome` decimal(12,2) NOT NULL DEFAULT '0',
	`totalExpenses` decimal(12,2) NOT NULL DEFAULT '0',
	`totalCashWithdrawn` decimal(12,2) NOT NULL DEFAULT '0',
	`totalCardWithdrawn` decimal(12,2) NOT NULL DEFAULT '0',
	`totalDifference` decimal(12,2) NOT NULL DEFAULT '0',
	`totalHoursWorked` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_summaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','housekeeping') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `pin` varchar(6);--> statement-breakpoint
ALTER TABLE `users` ADD `color` varchar(7) DEFAULT '#3b82f6';--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `scheduleTemplate` text;