# Referencias para disponibilidad y precios de Cloudbeds

Cloudbeds documenta que el endpoint `getRatePlans`, al consultar un rango con `detailedRates=true`, devuelve tarifas diarias, disponibilidad y restricciones. El campo `roomsAvailable` corresponde a las habitaciones disponibles por tipo (`roomTypeID`); todas las tarifas de un mismo tipo de habitación comparten esa disponibilidad. Si no se indica ocupación, `roomRate` y `totalRate` representan el precio por defecto. Para evitar duplicar tarifas derivadas, la vista operativa debe tomar una tarifa por tipo y día, priorizando la tarifa base si la respuesta la identifica.

La aplicación implementará una importación manual y de solo lectura. Usará el rango de siete días desde la fecha seleccionada y no modificará disponibilidad, precios ni reservas en Cloudbeds.

## Fuentes

- https://developers.cloudbeds.com/docs/booking-engine — Guía *Booking Engine*, sección **Retrieve ARI**: `getRatePlans` + `detailedRates`, `roomsAvailable`, `roomRate` y `totalRate`.
- https://www.cloudbeds.com/api/ — Descripción pública de la API de Cloudbeds y sus superficies de Operations, Reservations y Distribution.
