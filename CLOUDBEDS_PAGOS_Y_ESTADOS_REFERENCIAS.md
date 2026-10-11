# Cloudbeds: pagos y estados de reservas

## Pagos registrados externamente

Cloudbeds documenta `POST /api/v1.3/postPayment` para registrar un pago ya procesado contra una reserva. El formulario requiere `propertyID`, `reservationID`, `type` (uno de los métodos de pago activos), `amount`; acepta `description` e `isDeposit`. La guía recomienda obtener primero los métodos activos con `getPaymentMethods`, consultar el saldo de la reserva y añadir en la descripción una referencia trazable, como identificador de transacción o cuatro últimos dígitos.

La aplicación usará este endpoint exclusivamente para registrar pagos recibidos fuera de la app. No manejará datos de tarjeta ni procesará tarjetas. Antes de enviar se pedirá confirmación del importe, método y descripción; después se consultará el saldo de Cloudbeds para actualizar la tarjeta local.

## Estados de reserva

Cloudbeds expone `PUT /api/v1.3/putReservation` con `reservationID` y `status`. Estados admitidos: `confirmed`, `not_confirmed`, `canceled`, `checked_in`, `checked_out`, `no_show`.

Para check-in/check-out de una habitación asignada existen `POST /api/v1.3/postRoomCheckIn` y `postRoomCheckOut`; requieren `reservationID` más `roomID` o `subReservationID`. Como la tabla local actual no guarda estos identificadores de asignación, la primera implementación usa la actualización de estado de reserva y conserva la confirmación explícita.

## IVA y cargos

La API de disponibilidad devuelve las tarifas publicadas para cada fecha; la interfaz presentará esos importes como precio final con IVA incluido. En el detalle de movimientos se consolidarán los cargos de alojamiento y los cargos de impuesto/IVA asociados para evitar mostrarlos como líneas independientes.

## Fuentes

- https://developers.cloudbeds.com/reference/post_postpayment-2
- https://developers.cloudbeds.com/reference/get_getpaymentmethods-2
- https://developers.cloudbeds.com/docs/payment-processing
- https://developers.cloudbeds.com/reference/put_putreservation-2
- https://developers.cloudbeds.com/reference/post_postroomcheckin-2
- https://developers.cloudbeds.com/reference/post_postroomcheckout-2

## Agenda y relevos de habitación

La documentación del Calendario Clásico de Cloudbeds describe el calendario como la vista operativa para asignar habitaciones y gestionar reservas. Su leyenda distingue las barras por estado, con barra verde para huéspedes alojados, azul claro para confirmadas y gris oscuro tras el check-out. Los indicadores de nota y saldo pendiente se muestran sobre la reserva.

La agenda local replica esos límites con medias celdas: una estancia comienza en la mitad final de su fecha de entrada y termina en la primera mitad de la fecha de salida. Por eso, dos reservas consecutivas con salida y entrada el mismo día usan un solo carril y se tocan únicamente en el relevo, sin superponerse.

Fuente adicional:

- https://myfrontdesk.cloudbeds.com/hc/en-us/articles/235146587-Classic-calendar-Everything-you-need-to-know
- https://myfrontdesk.cloudbeds.com/hc/en-us/articles/18387139910939-Manage-reservations-on-the-Classic-calendar

## Métodos de pago activos

Cloudbeds documenta `getPaymentMethods` en `GET /api/v1.3/getPaymentMethods`. La operación recibe `propertyID` y permite `lang=es`; devuelve la lista de métodos activos de la propiedad. El lector de la aplicación admite tanto las listas directas como respuestas anidadas y variantes de los nombres de los campos para mantener la compatibilidad con respuestas de diferentes configuraciones.

Fuente:

- https://developers.cloudbeds.com/reference/get_getpaymentmethods-2

## Cargos de estancias de varias noches

La Accounting API de Cloudbeds pagina los resultados de `POST /accounting/v1.0/transactions`. El parámetro oficial es `limit` (hasta 1100) y el cursor se recibe en `nextPageToken`; la consulta debe repetir el cursor hasta que sea nulo. La aplicación utiliza el par `source_identifier` + `source_kind=RESERVATION`, que Cloudbeds documenta como el filtro requerido para recuperar todos los movimientos de una reserva. El lector también acepta la variante `next_page_token` observada en algunas respuestas.

Fuentes:

- https://developers.cloudbeds.com/docs/accounting
- https://github.com/cloudbeds/openapi-specs/blob/main/src/accounting-v1.0-openapi.json

## Conciliación de estancias con varias noches

En Accounting API, `sourceId` identifica el folio interno de una reserva y `subSourceId` diferencia las habitaciones o subreservas que la componen. Por ello, tras localizar una reserva mediante `source_identifier`, la aplicación vuelve a consultar cada `sourceId` devuelto con `source_kind=RESERVATION`; así recupera todas las noches, cargos, tasas y pagos del folio. Los impuestos se vinculan al movimiento padre mediante `parentId`, evitando sumarlos a una habitación distinta si comparten fecha de servicio.

Fuentes:

- https://developers.cloudbeds.com/docs/accounting
- https://developers.cloudbeds.com/docs/example-1-update-room-price-and-routed-transactions
