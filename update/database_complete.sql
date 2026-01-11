-- ============================================
-- HOSTEL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================
-- Este script crea todas las tablas necesarias para el sistema
-- Ejecutar en MySQL 8.0+ o compatible

-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `openId` VARCHAR(64) NOT NULL UNIQUE,
  `name` TEXT,
  `email` VARCHAR(320),
  `username` VARCHAR(100),
  `passwordHash` VARCHAR(255),
  `loginMethod` VARCHAR(64),
  `role` ENUM('user', 'admin', 'housekeeping') NOT NULL DEFAULT 'user',
  `pin` VARCHAR(6),
  `color` VARCHAR(7) DEFAULT '#3b82f6',
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `scheduleTemplate` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== BUSINESSES ====================
CREATE TABLE IF NOT EXISTS `businesses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `description` TEXT,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SHIFTS ====================
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `scheduledDate` VARCHAR(10) NOT NULL,
  `scheduledStart` VARCHAR(5) NOT NULL,
  `scheduledEnd` VARCHAR(5) NOT NULL,
  `actualStart` TIMESTAMP NULL,
  `actualEnd` TIMESTAMP NULL,
  `hoursWorked` DECIMAL(5,2),
  `notes` TEXT,
  `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== CASH REGISTERS ====================
CREATE TABLE IF NOT EXISTS `cash_registers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `businessId` INT NOT NULL,
  `userId` INT NOT NULL,
  `shiftId` INT,
  `date` VARCHAR(10) NOT NULL,
  `openingAmount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `closingAmount` DECIMAL(10,2),
  `expectedAmount` DECIMAL(10,2),
  `difference` DECIMAL(10,2),
  `cashWithdrawn` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `cardWithdrawn` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `notes` TEXT,
  `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `businessId` INT NOT NULL,
  `cashRegisterId` INT,
  `userId` INT NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `category` VARCHAR(100),
  `concept` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `paymentMethod` ENUM('cash', 'card', 'transfer', 'cuenta_bancaria', 'ana', 'juanlu', 'caja_hostel', 'caja_tienda', 'caja_fuerte', 'caja_fuerte_cambio', 'other') NOT NULL DEFAULT 'cash',
  `date` VARCHAR(10) NOT NULL,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== GUESTS (CHECK-IN) ====================
CREATE TABLE IF NOT EXISTS `guests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `firstName` VARCHAR(100) NOT NULL,
  `lastName` VARCHAR(100) NOT NULL,
  `nationality` VARCHAR(3) NOT NULL,
  `documentType` ENUM('NIF', 'NIE', 'PAS', 'OTRO') NOT NULL,
  `documentNumber` VARCHAR(50) NOT NULL,
  `documentSupport` VARCHAR(50),
  `gender` ENUM('Hombre', 'Mujer', 'Otro') NOT NULL,
  `birthDate` VARCHAR(10) NOT NULL,
  `phone` VARCHAR(20),
  `email` VARCHAR(320),
  `street` VARCHAR(255),
  `city` VARCHAR(100),
  `province` VARCHAR(100),
  `postalCode` VARCHAR(20),
  `country` VARCHAR(3),
  `reservationNumber` VARCHAR(100),
  `reservationOrigin` VARCHAR(100),
  `checkInDate` TIMESTAMP,
  `checkOutDate` TIMESTAMP,
  `roomNumber` VARCHAR(20),
  `roomType` VARCHAR(50),
  `roomCode` VARCHAR(50),
  `entranceCode` VARCHAR(50),
  `numberOfRooms` INT DEFAULT 1,
  `hasInternet` BOOLEAN DEFAULT TRUE,
  `accommodationType` VARCHAR(50),
  `paymentType` ENUM('EFECT', 'TARJT', 'TRANS', 'PLATF', 'MOVIL', 'TREG', 'DESTI', 'OTRO') NOT NULL,
  `paymentDate` VARCHAR(10),
  `paymentHolder` VARCHAR(200),
  `paymentMethod` VARCHAR(100),
  `amountPaid` VARCHAR(20),
  `amountPending` VARCHAR(20),
  `signature` TEXT,
  `status` ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_checkInDate` (`checkInDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== ACCESS CODES (Habitaciones) ====================
CREATE TABLE IF NOT EXISTS `access_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `roomNumber` VARCHAR(20) NOT NULL UNIQUE,
  `roomType` VARCHAR(50) NOT NULL,
  `roomCode` VARCHAR(50),
  `entranceCode` VARCHAR(50),
  `notes` TEXT,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== HOSTEL SETTINGS ====================
CREATE TABLE IF NOT EXISTS `hostel_settings_checkin` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `establishmentCode` VARCHAR(50),
  `establishmentName` VARCHAR(200),
  `establishmentAddress` VARCHAR(255),
  `establishmentCity` VARCHAR(100),
  `establishmentProvince` VARCHAR(100),
  `establishmentPostalCode` VARCHAR(20),
  `establishmentCountry` VARCHAR(3) DEFAULT 'ESP',
  `establishmentPhone` VARCHAR(20),
  `establishmentEmail` VARCHAR(320),
  `municipioCode` VARCHAR(10),
  `termsAndConditionsES` TEXT,
  `termsAndConditionsEN` TEXT,
  `privacyPolicyES` TEXT,
  `privacyPolicyEN` TEXT,
  `logoUrl` VARCHAR(500),
  `primaryColor` VARCHAR(7) DEFAULT '#3b82f6',
  `secondaryColor` VARCHAR(7) DEFAULT '#10b981',
  `emailNotifications` BOOLEAN DEFAULT TRUE,
  `smsNotifications` BOOLEAN DEFAULT FALSE,
  `autoDeleteDays` INT DEFAULT 3,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== INVENTORY PRODUCTS ====================
CREATE TABLE IF NOT EXISTS `inventory_products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100),
  `unit` VARCHAR(50) NOT NULL,
  `minStock` DECIMAL(10,2) DEFAULT 0,
  `currentStock` DECIMAL(10,2) DEFAULT 0,
  `notes` TEXT,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== INVENTORY ITEMS ====================
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `businessId` INT NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100),
  `sku` VARCHAR(100),
  `barcode` VARCHAR(100),
  `unit` VARCHAR(50) NOT NULL,
  `currentStock` DECIMAL(10,2) DEFAULT 0,
  `minStock` DECIMAL(10,2) DEFAULT 0,
  `costPrice` DECIMAL(10,2),
  `salePrice` DECIMAL(10,2),
  `notes` TEXT,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== STOCK MOVEMENTS ====================
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `itemId` INT NOT NULL,
  `type` ENUM('entrada', 'salida', 'ajuste') NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL,
  `reason` VARCHAR(255),
  `userId` INT NOT NULL,
  `date` VARCHAR(10) NOT NULL,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SUPPLIERS ====================
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `contactPerson` VARCHAR(200),
  `phone` VARCHAR(20),
  `email` VARCHAR(320),
  `address` TEXT,
  `taxId` VARCHAR(50),
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== INVOICES ====================
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `businessId` INT NOT NULL,
  `supplierId` INT,
  `invoiceNumber` VARCHAR(100) NOT NULL,
  `date` VARCHAR(10) NOT NULL,
  `dueDate` VARCHAR(10),
  `subtotal` DECIMAL(10,2) NOT NULL,
  `tax` DECIMAL(10,2) DEFAULT 0,
  `total` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending',
  `paymentMethod` VARCHAR(50),
  `paymentDate` VARCHAR(10),
  `notes` TEXT,
  `fileUrl` VARCHAR(500),
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TASKS (Housekeeping) ====================
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `type` ENUM('cleaning', 'maintenance', 'laundry', 'inspection', 'other') NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `status` ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `assignedTo` INT,
  `roomNumber` VARCHAR(20),
  `dueDate` VARCHAR(10),
  `completedAt` TIMESTAMP NULL,
  `notes` TEXT,
  `createdBy` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== ROOM STATUS ====================
CREATE TABLE IF NOT EXISTS `room_status` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `roomNumber` VARCHAR(20) NOT NULL UNIQUE,
  `status` ENUM('clean', 'dirty', 'cleaning', 'maintenance', 'occupied', 'available') NOT NULL DEFAULT 'available',
  `lastCleaned` TIMESTAMP NULL,
  `lastInspected` TIMESTAMP NULL,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== INCIDENTS ====================
CREATE TABLE IF NOT EXISTS `incidents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `type` ENUM('maintenance', 'security', 'complaint', 'other') NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `roomNumber` VARCHAR(20),
  `reportedBy` INT NOT NULL,
  `assignedTo` INT,
  `resolvedAt` TIMESTAMP NULL,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('info', 'warning', 'error', 'success') NOT NULL DEFAULT 'info',
  `isRead` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== CASH CLOSINGS ====================
CREATE TABLE IF NOT EXISTS `cash_closings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `businessId` INT NOT NULL,
  `userId` INT NOT NULL,
  `date` VARCHAR(10) NOT NULL,
  `openingAmount` DECIMAL(10,2) DEFAULT 0,
  `closingAmount` DECIMAL(10,2) DEFAULT 0,
  `expectedAmount` DECIMAL(10,2) DEFAULT 0,
  `difference` DECIMAL(10,2) DEFAULT 0,
  `totalIncome` DECIMAL(10,2) DEFAULT 0,
  `totalExpense` DECIMAL(10,2) DEFAULT 0,
  `cashIncome` DECIMAL(10,2) DEFAULT 0,
  `cardIncome` DECIMAL(10,2) DEFAULT 0,
  `cashExpense` DECIMAL(10,2) DEFAULT 0,
  `cardExpense` DECIMAL(10,2) DEFAULT 0,
  `notes` TEXT,
  `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== OTROS GASTOS ====================
CREATE TABLE IF NOT EXISTS `otros_gastos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `gasto` VARCHAR(255) NOT NULL,
  `type` ENUM('efectivo', 'tarjeta') NOT NULL,
  `fecha` VARCHAR(10) NOT NULL,
  `importe` DECIMAL(10,2) NOT NULL,
  `businessId` INT NOT NULL,
  `userId` INT NOT NULL,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SYSTEM SETTINGS ====================
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== APP SETTINGS ====================
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT,
  `description` TEXT,
  `category` VARCHAR(50),
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== WEEKLY SUMMARIES ====================
CREATE TABLE IF NOT EXISTS `weekly_summaries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `weekStart` VARCHAR(10) NOT NULL,
  `weekEnd` VARCHAR(10) NOT NULL,
  `totalIncome` DECIMAL(10,2) DEFAULT 0,
  `totalExpense` DECIMAL(10,2) DEFAULT 0,
  `netProfit` DECIMAL(10,2) DEFAULT 0,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SAFE BOXES ====================
CREATE TABLE IF NOT EXISTS `safe_boxes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('main', 'change', 'other') NOT NULL DEFAULT 'main',
  `currentAmount` DECIMAL(10,2) DEFAULT 0,
  `notes` TEXT,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== CASH MOVEMENTS ====================
CREATE TABLE IF NOT EXISTS `cash_movements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `fromLocation` VARCHAR(100) NOT NULL,
  `toLocation` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `date` VARCHAR(10) NOT NULL,
  `notes` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== ORDERS ====================
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `businessId` INT NOT NULL,
  `userId` INT NOT NULL,
  `orderNumber` VARCHAR(50) NOT NULL UNIQUE,
  `date` VARCHAR(10) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `tax` DECIMAL(10,2) DEFAULT 0,
  `total` DECIMAL(10,2) NOT NULL,
  `paymentMethod` VARCHAR(50),
  `status` ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== ORDER ITEMS ====================
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orderId` INT NOT NULL,
  `itemId` INT NOT NULL,
  `itemName` VARCHAR(200) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL,
  `unitPrice` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== HISTORICAL CASH DATA ====================
CREATE TABLE IF NOT EXISTS `historical_cash_data` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `date` VARCHAR(10) NOT NULL UNIQUE,
  `businessId` INT NOT NULL,
  `totalIncome` DECIMAL(10,2) DEFAULT 0,
  `totalExpense` DECIMAL(10,2) DEFAULT 0,
  `netProfit` DECIMAL(10,2) DEFAULT 0,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== WEEKLY CASH ENVELOPES ====================
CREATE TABLE IF NOT EXISTS `weekly_cash_envelopes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `weekStart` VARCHAR(10) NOT NULL,
  `weekEnd` VARCHAR(10) NOT NULL,
  `totalAmount` DECIMAL(10,2) DEFAULT 0,
  `status` ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== WEEKLY AVAILABILITY SOURCES ====================
CREATE TABLE IF NOT EXISTS `weekly_availability_sources` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `weekStart` VARCHAR(10) NOT NULL,
  `weekEnd` VARCHAR(10) NOT NULL,
  `source` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== WEEKLY AVAILABILITY RECORDS ====================
CREATE TABLE IF NOT EXISTS `weekly_availability_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `weekStart` VARCHAR(10) NOT NULL,
  `weekEnd` VARCHAR(10) NOT NULL,
  `totalAvailable` DECIMAL(10,2) DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SHIFT TEMPLATES ====================
CREATE TABLE IF NOT EXISTS `shift_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `startTime` VARCHAR(5) NOT NULL,
  `endTime` VARCHAR(5) NOT NULL,
  `description` TEXT,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== CHEF SANDWICH ORDERS ====================
CREATE TABLE IF NOT EXISTS `chef_sandwich_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orderNumber` VARCHAR(50) NOT NULL UNIQUE,
  `date` VARCHAR(10) NOT NULL,
  `status` ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar negocios por defecto
INSERT IGNORE INTO `businesses` (`id`, `name`, `code`, `description`) VALUES
(1, 'Hostel', 'hostel', 'The Spot Central Hostel'),
(2, 'Tienda', 'tienda', 'Tienda del Hostel');

-- Insertar configuración inicial del hostel
INSERT IGNORE INTO `hostel_settings_checkin` (
  `id`,
  `establishmentCode`,
  `establishmentName`,
  `establishmentAddress`,
  `establishmentCity`,
  `establishmentProvince`,
  `establishmentPostalCode`,
  `establishmentCountry`,
  `establishmentPhone`,
  `establishmentEmail`,
  `termsAndConditionsES`,
  `termsAndConditionsEN`,
  `privacyPolicyES`,
  `privacyPolicyEN`,
  `autoDeleteDays`
) VALUES (
  1,
  '0000109745',
  'THE SPOT CENTRAL HOSTEL',
  'Calle Adriano 6',
  'Sevilla',
  'Sevilla',
  '41001',
  'ESP',
  '+34 XXX XXX XXX',
  'thespotcentralhostel@gmail.com',
  'Los huéspedes manifiestan que han leído, conocen y se comprometen a cumplir las normas y condiciones del establecimiento.',
  'The guests state that they have read, know, undertake and agree to comply with the rules and conditions of the establishment.',
  'Política de protección de datos disponible en recepción.',
  'Privacy policy available at reception.',
  3
);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
