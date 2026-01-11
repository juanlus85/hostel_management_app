-- Script SQL para insertar configuración inicial del sistema de Check-in
-- EJECUTAR EN phpMyAdmin después del script anterior

-- Verificar si ya existe configuración
SELECT COUNT(*) AS 'Registros existentes' FROM hostel_settings_checkin;

-- Insertar configuración inicial (solo si no existe)
INSERT INTO `hostel_settings_checkin` (
    `policeCode`,
    `hostelName`,
    `hostelAddress`,
    `hostelEmail`,
    `hostelWebsite`,
    `hostelRta`,
    `municipioCode`,
    `hostelPhone`,
    `checkoutTime`,
    `termsAndConditionsES`,
    `termsAndConditionsEN`,
    `privacyPolicyES`,
    `privacyPolicyEN`,
    `welcomeMessageEs`,
    `welcomeMessageEn`
) 
SELECT * FROM (SELECT
    'CODIGO_ESTABLECIMIENTO' AS policeCode,
    'The Spot Central Hostel' AS hostelName,
    'Calle Principal, Sevilla' AS hostelAddress,
    'thespotcentralhostel@gmail.com' AS hostelEmail,
    'https://thespotcentralhostel.com' AS hostelWebsite,
    'H/SE/01189' AS hostelRta,
    '41091' AS municipioCode,
    '+34 XXX XXX XXX' AS hostelPhone,
    '11:00' AS checkoutTime,
    'Los huéspedes manifiestan que han leído, conocen y se comprometen a cumplir las normas y condiciones del establecimiento. Éstas se encuentran a disposición del huésped, expuestas en la recepción del establecimiento.' AS termsAndConditionsES,
    'The guests state that they have read, know, undertake and agree to comply with the rules and conditions of the establishment. These are available to the guests, displayed at the reception of the establishment.' AS termsAndConditionsEN,
    'Política de privacidad del establecimiento.' AS privacyPolicyES,
    'Privacy policy of the establishment.' AS privacyPolicyEN,
    'Welcome to our Home' AS welcomeMessageEs,
    'Welcome to our Home' AS welcomeMessageEn
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM hostel_settings_checkin LIMIT 1
) LIMIT 1;

-- Verificar que se insertó correctamente
SELECT 
    id,
    hostelName,
    policeCode,
    municipioCode,
    hostelRta,
    checkoutTime
FROM hostel_settings_checkin 
LIMIT 1;

SELECT '¡Configuración inicial insertada! Ahora refresca la página de check-in.' AS mensaje;
