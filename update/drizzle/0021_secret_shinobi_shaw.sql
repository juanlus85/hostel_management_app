CREATE TABLE `safe_boxes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`type` enum('entrada_efectivo_caja','salida_efectivo_cambio','entrada_salida_bbva','descuadres','sueldos','pago_proveedor','ajuste','caja_semana','es_efectivo_cf_hostel','es_efectivo_cf_tienda') NOT NULL,
	`concept` varchar(255),
	`amount` decimal(10,2) NOT NULL,
	`accumulated` decimal(10,2) NOT NULL,
	`checkStatus` enum('unchecked','correct','incorrect') NOT NULL DEFAULT 'unchecked',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `safe_boxes_id` PRIMARY KEY(`id`)
);
