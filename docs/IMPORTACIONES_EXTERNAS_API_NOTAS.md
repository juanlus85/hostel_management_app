# Notas de integración: Loyverse y Cloudbeds

## Loyverse

- API REST v1.0 con base `https://api.loyverse.com/v1.0`.
- Para la primera integración propia se puede usar un token de acceso personal con cabecera `Authorization: Bearer <token>`.
- Los permisos mínimos para importar las cajas diarias son `SHIFTS_READ`, `RECEIPTS_READ`, `PAYMENT_TYPES_READ` y `STORES_READ`.
- La API expone recursos de recibos y turnos, por lo que la primera importación manual puede capturar los cierres y movimientos de cada tienda sin afectar a `cash_closings` ni a los datos operativos actuales.

## Cloudbeds

- API con autenticación OAuth 2.0 y credenciales de aplicación creadas desde la propiedad.
- La documentación expone recursos de panel, pagos, reservas, huéspedes y webhooks.
- La primera versión mantendrá la conexión y los datos importados separados de los módulos actuales. No se realizarán escrituras en reservas, huéspedes, caja o facturación existentes.

## Decisión inicial

El menú ofrecerá importaciones manuales, historial de ejecuciones y vista de datos externos aislados. Las credenciales se guardarán como secretos de entorno y no se mostrarán nunca en la interfaz ni se incluirán en el código. Las automatizaciones recurrentes o webhooks se evaluarán posteriormente, cuando estén definidos los datos exactos y la frecuencia deseada.
