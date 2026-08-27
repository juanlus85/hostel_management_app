# Credenciales de importaciones externas

## Cloudbeds

Cloudbeds usa credenciales OAuth gestionadas desde **Integraciones de API y Credenciales** de la propiedad. Tras crear una credencial OAuth, deben conservarse el identificador y el secreto de cliente. La aplicación utiliza las variables privadas de proceso `CLOUDBEDS_CLIENT_ID` y `CLOUDBEDS_CLIENT_SECRET`; no deben incorporarse al repositorio ni a la base de datos.

La conexión está preparada, pero su autorización y la primera importación de Hostel se implementarán después de disponer de esas credenciales. Referencias: [Cloudbeds API Authentication](https://developers.cloudbeds.com/reference/authentication) y [Cloudbeds PMS API](https://developers.cloudbeds.com/reference/about-pms-api).

## Loyverse

La importación usa el recurso de recibos de Loyverse, no el historial de turnos. La cuenta conectada limita la consulta a los últimos 31 días, por lo que la aplicación acota las peticiones y muestra un mínimo de fecha. Las ventas se agrupan por jornada operativa de 07:00 a 07:00 en la zona horaria de Sevilla.

Referencia: [Loyverse API](https://developer.loyverse.com/docs/).
