# Cloudbeds: creación manual de reservas

## Fuentes consultadas

- https://developers.cloudbeds.com/reference/post_postreservation-2
- https://developers.cloudbeds.com/reference/get_getavailableroomtypes-2
- https://developers.cloudbeds.com/docs/reservation-faqs
- https://github.com/cloudbeds/openapi-specs/blob/main/src/pms-v1.3-openapi.yaml

## Contrato relevante (PMS API v1.3)

`POST https://api.cloudbeds.com/api/v1.3/postReservation` requiere el scope `write:reservation` y recibe formulario URL-encoded. Campos de estancia y huésped requeridos por el contrato:

- `propertyID`
- `startDate`, `endDate`
- `guestFirstName`, `guestLastName`
- `guestCountry`, `guestZip`, `guestEmail`
- Colecciones `rooms`, `adults`, `children`; cada entrada de habitación incluye `roomTypeID` y `quantity`.
- `paymentMethod` admite `cash`, `credit`, `ebanking` o `pay_pal`.

La respuesta incluye `reservationID`, estado, total y una lista de habitaciones aún sin asignar. El endpoint crea una reserva; no debe llamarse hasta que el usuario confirme el resumen exacto.

## Verificación de disponibilidad

`GET https://api.cloudbeds.com/api/v1.3/getAvailableRoomTypes` requiere `startDate`, `endDate`, `rooms`, `adults` y `children`, y acepta `detailedRates=true` e `includeSharedRooms=true`. Se utilizará justo antes de confirmar la reserva y se comparará el tipo elegido contra los tipos disponibles para las fechas completas.

## Fuente de reserva

Cloudbeds permite `sourceID` opcional. Si no se especifica, el FAQ indica que se utiliza Website / Booking Engine. Para la creación manual de recepción se debe consultar `getSources` y seleccionar una fuente explícita (por ejemplo, Walk In) cuando esté disponible.
