
## Actualización confirmada de tarifas

Cloudbeds documenta `POST /api/v1.3/putRate` para actualizar tarifas de una tarifa base (no derivada). La petición admite varias tarifas y, para cada `rateID`, uno o varios intervalos con `startDate`, `endDate`, `rate` y opcionalmente `blocked`. Se procesa de forma asíncrona y devuelve `jobReferenceID`; Cloudbeds limita la operación a 30 intervalos. La interfaz debe cambiar solamente una fecha y un precio por operación, mostrando antes una confirmación con habitación, fecha, importe anterior y nuevo. No debe actualizar planes derivados.

- https://developers.cloudbeds.com/reference/post_putrate-2 — `putRate`, esquema `rates[] → rateID, interval[] → startDate, endDate, rate, blocked` y procesamiento asíncrono.
- https://developers.cloudbeds.com/docs/booking-engine — `rateID` es único por combinación de tipo de habitación y tarifa, y se usa para actualizaciones de tarifa.
