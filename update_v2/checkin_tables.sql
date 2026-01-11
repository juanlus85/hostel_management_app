-- ============================================
-- TABLAS DE CHECK-IN - HOSTEL MANAGEMENT SYSTEM
-- ============================================
-- Script para crear las tablas necesarias para el módulo de check-in
-- Ejecutar en MySQL 8.0+ o compatible

-- ==================== GUESTS (Huéspedes) ====================
CREATE TABLE IF NOT EXISTS `guests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `firstName` VARCHAR(100) NOT NULL COMMENT 'Nombre del huésped',
  `lastName` VARCHAR(100) NOT NULL COMMENT 'Apellidos del huésped',
  `nationality` VARCHAR(3) NOT NULL COMMENT 'Nacionalidad (código ISO alfa-3)',
  `documentType` ENUM('NIF', 'NIE', 'PAS', 'OTRO') NOT NULL COMMENT 'Tipo de documento',
  `documentNumber` VARCHAR(50) NOT NULL COMMENT 'Número de documento',
  `documentSupport` VARCHAR(50) COMMENT 'Número de soporte del documento',
  `gender` ENUM('Hombre', 'Mujer', 'Otro') NOT NULL COMMENT 'Género del huésped',
  `birthDate` VARCHAR(10) NOT NULL COMMENT 'Fecha de nacimiento (YYYY-MM-DD)',
  `phone` VARCHAR(20) COMMENT 'Teléfono de contacto',
  `email` VARCHAR(320) COMMENT 'Email de contacto',
  
  -- Dirección
  `street` VARCHAR(255) COMMENT 'Calle y número',
  `city` VARCHAR(100) COMMENT 'Ciudad',
  `province` VARCHAR(100) COMMENT 'Provincia',
  `postalCode` VARCHAR(20) COMMENT 'Código postal',
  `country` VARCHAR(3) COMMENT 'País (código ISO alfa-3)',
  
  -- Datos de reserva
  `reservationNumber` VARCHAR(100) COMMENT 'Número de reserva',
  `reservationOrigin` VARCHAR(100) COMMENT 'Origen de la reserva (Booking, Airbnb, etc.)',
  `checkInDate` TIMESTAMP COMMENT 'Fecha y hora de entrada',
  `checkOutDate` TIMESTAMP COMMENT 'Fecha y hora de salida',
  
  -- Datos de habitación
  `roomNumber` VARCHAR(20) COMMENT 'Número de habitación',
  `roomType` VARCHAR(50) COMMENT 'Tipo de habitación',
  `roomCode` VARCHAR(50) COMMENT 'Código de acceso a la habitación',
  `entranceCode` VARCHAR(50) COMMENT 'Código de acceso al edificio',
  `numberOfRooms` INT DEFAULT 1 COMMENT 'Número de habitaciones',
  `hasInternet` BOOLEAN DEFAULT TRUE COMMENT 'Tiene acceso a internet',
  `accommodationType` VARCHAR(50) COMMENT 'Tipo de alojamiento (S.A., Media Pensión, etc.)',
  
  -- Datos de pago
  `paymentType` ENUM('EFECT', 'TARJT', 'TRANS', 'PLATF', 'MOVIL', 'TREG', 'DESTI', 'OTRO') NOT NULL COMMENT 'Tipo de pago (códigos oficiales Hospederías)',
  `paymentDate` VARCHAR(10) COMMENT 'Fecha de pago (YYYY-MM-DD)',
  `paymentHolder` VARCHAR(200) COMMENT 'Titular del pago',
  `paymentMethod` VARCHAR(100) COMMENT 'Medio de pago (ej: Transferencia Booking)',
  `amountPaid` VARCHAR(20) COMMENT 'Cantidad abonada',
  `amountPending` VARCHAR(20) COMMENT 'Cantidad pendiente',
  
  -- Firma y estado
  `signature` TEXT COMMENT 'Firma del huésped (base64)',
  `status` ENUM('pending', 'completed') NOT NULL DEFAULT 'pending' COMMENT 'Estado del check-in',
  
  -- Metadatos
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices para mejorar rendimiento
  INDEX `idx_status` (`status`),
  INDEX `idx_checkInDate` (`checkInDate`),
  INDEX `idx_documentNumber` (`documentNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabla de huéspedes para check-in y exportación a Policía';

-- ==================== HOSTEL SETTINGS (Configuración del Hostel) ====================
CREATE TABLE IF NOT EXISTS `hostel_settings_checkin` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Datos del establecimiento
  `establishmentCode` VARCHAR(50) COMMENT 'Código del establecimiento en Hospederías',
  `establishmentName` VARCHAR(200) COMMENT 'Nombre del establecimiento',
  `establishmentAddress` VARCHAR(255) COMMENT 'Dirección del establecimiento',
  `establishmentCity` VARCHAR(100) COMMENT 'Ciudad',
  `establishmentProvince` VARCHAR(100) COMMENT 'Provincia',
  `establishmentPostalCode` VARCHAR(20) COMMENT 'Código postal',
  `establishmentCountry` VARCHAR(3) DEFAULT 'ESP' COMMENT 'País (código ISO alfa-3)',
  `establishmentPhone` VARCHAR(20) COMMENT 'Teléfono de contacto',
  `establishmentEmail` VARCHAR(320) COMMENT 'Email de contacto',
  `municipioCode` VARCHAR(10) COMMENT 'Código de municipio INE',
  
  -- Términos y condiciones
  `termsAndConditionsES` TEXT COMMENT 'Términos y condiciones en español',
  `termsAndConditionsEN` TEXT COMMENT 'Términos y condiciones en inglés',
  `privacyPolicyES` TEXT COMMENT 'Política de privacidad en español',
  `privacyPolicyEN` TEXT COMMENT 'Política de privacidad en inglés',
  
  -- Personalización
  `logoUrl` VARCHAR(500) COMMENT 'URL del logo del establecimiento',
  `primaryColor` VARCHAR(7) DEFAULT '#3b82f6' COMMENT 'Color primario (hex)',
  `secondaryColor` VARCHAR(7) DEFAULT '#10b981' COMMENT 'Color secundario (hex)',
  
  -- Notificaciones
  `emailNotifications` BOOLEAN DEFAULT TRUE COMMENT 'Enviar notificaciones por email',
  `smsNotifications` BOOLEAN DEFAULT FALSE COMMENT 'Enviar notificaciones por SMS',
  
  -- Configuración de limpieza automática
  `autoDeleteDays` INT DEFAULT 3 COMMENT 'Días después del check-in para eliminar automáticamente',
  
  -- Metadatos
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Configuración del sistema de check-in del hostel';

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar configuración inicial del hostel (solo si no existe)
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
  'Los huéspedes manifiestan que han leído, conocen y se comprometen a cumplir las normas y condiciones del establecimiento. Estas se encuentran a disposición del huésped, expuestas en la recepción del establecimiento.',
  'The guests state that they have read, know, undertake and agree to comply with the rules and conditions of the establishment. These are available to the guests, displayed at the reception of the establishment.',
  'Política de protección de datos disponible en recepción del establecimiento.',
  'Privacy policy available at the reception of the establishment.',
  3
);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecutar estas consultas para verificar que las tablas se crearon correctamente:
-- SHOW TABLES LIKE 'guests';
-- SHOW TABLES LIKE 'hostel_settings_checkin';
-- DESCRIBE guests;
-- DESCRIBE hostel_settings_checkin;
-- SELECT * FROM hostel_settings_checkin;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
