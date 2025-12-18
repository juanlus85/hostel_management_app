CREATE TABLE `otros_gastos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`concepto` varchar(255) NOT NULL,
	`categoria` enum('sueldos','seguridad_social','impuestos','seguros','otros') NOT NULL,
	`categoriaOtros` varchar(100),
	`importe` decimal(10,2) NOT NULL,
	`fecha` date NOT NULL,
	`notas` text,
	`createdBy` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `otros_gastos_id` PRIMARY KEY(`id`)
);
