# Cloudbeds: detalle de reservas y pagos

La API `getReservation` devuelve el detalle operativo de una reserva por `reservationID`. Para los movimientos económicos actuales, Cloudbeds documenta que `/accounting/v1.0/transactions` reemplaza endpoints antiguos y permite filtrar las transacciones de una reserva mediante `source_identifier` con el ID de reserva y `source_kind` igual a `RESERVATION`.

La vista de detalle consultará estas fuentes únicamente cuando el personal abra una reserva; no se almacenará un historial adicional de pagos en la aplicación.

## Referencias

- https://developers.cloudbeds.com/reference/get_getreservation-2
- https://developers.cloudbeds.com/docs/documentation-to-support-cloudbeds-api-transaction-termination
- https://developers.cloudbeds.com/docs/schema-mapping-accounting-api-cloudbeds-api
