# Credenciales de importaciones externas

## Cloudbeds

Para esta propiedad, la integración debe usar una **API key de Cloudbeds**. En **Integraciones de API y Credenciales**, crea o abre la credencial, accede a su columna **API Key** y pulsa **Create**. Selecciona solo los permisos de lectura necesarios para las futuras consultas de reservas, pagos o informes. Cloudbeds mostrará la clave una única vez; debe guardarse como variable privada de proceso con el nombre `CLOUDBEDS_API_KEY`.

No se debe guardar la clave en el repositorio, archivos de código ni la base de datos. Para importaciones de lectura de la propiedad, los valores `CLOUDBEDS_CLIENT_ID` y `CLOUDBEDS_CLIENT_SECRET` no son necesarios. Referencia: [Guía oficial de API key de Cloudbeds](https://developers.cloudbeds.com/docs/quickstart-guide-api-authentication-for-property-level-users).

La importación de caja usará el endpoint `POST https://api.cloudbeds.com/accounting/v1.0/transactions` con cabeceras `Authorization: Bearer <API_KEY>` y `X-Property-ID`. El permiso mínimo necesario es `read:payment`. La API exige el identificador de propiedad y permite filtrar por `transaction_datetime`; los resultados se paginan con `nextPageToken`. Los códigos internos de pago son `9000`, `9100`, `9200` y `9300`; sus ajustes o devoluciones usan los sufijos `A` o `V`. Fuentes: [Cloudbeds Accounting API](https://developers.cloudbeds.com/docs/accounting) y [migración de transacciones](https://developers.cloudbeds.com/docs/documentation-to-support-cloudbeds-api-transaction-termination).

## Loyverse

La importación usa el recurso de recibos de Loyverse, no el historial de turnos. La cuenta conectada limita la consulta a los últimos 31 días, por lo que la aplicación acota las peticiones y muestra un mínimo de fecha. Las ventas se agrupan por jornada operativa de 07:00 a 07:00 en la zona horaria de Sevilla.

Referencia: [Loyverse API](https://developer.loyverse.com/docs/).
