
## Codificación de la colección `rates`

El error de Cloudbeds confirma que `rates` no admite un JSON serializado dentro de un único campo de formulario. La actualización se envía como formulario anidado: `rates[0][rateID]`, `rates[0][interval][0][startDate]`, `rates[0][interval][0][endDate]` y `rates[0][interval][0][rate]`. Así el servidor interpreta correctamente `rates` como colección.
