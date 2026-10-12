# Cloudbeds: documentos fiscales oficiales de reserva

## Hallazgo funcional

Cloudbeds expone su servicio de documentos fiscales en `/fiscal-document/v1`.

- `GET /fiscal-document/v1/fiscal-documents` lista documentos filtrables por `sourceIds` y `sourceKind` (`RESERVATION`).
- `GET /fiscal-document/v1/fiscal-documents/{id}/download` descarga el archivo oficial generado por Cloudbeds; admite un `fileId` opcional.
- La creación de una factura exige `sourceId`, `sourceKind=RESERVATION` y la selección de transacciones/folios a facturar.
- La creación de un recibo exige un pago/transacción y puede requerir asignaciones.
- Estas operaciones usan autenticación `Bearer` u OAuth con scopes `read:reservation` y `write:reservation`; la clave heredada de PMS usada por la aplicación para endpoints v1.3 puede no servir para este servicio.

## Implicación de diseño

La aplicación debe listar y descargar primero los documentos oficiales ya creados en Cloudbeds. La emisión de una factura o recibo oficial requiere una configuración fiscal activa y una selección confirmada de transacciones; no debe simularse con un PDF local.

## Referencias

1. https://developers.cloudbeds.com/reference/getfiscaldocuments
2. https://developers.cloudbeds.com/reference/downloadfiscaldocument
3. https://developers.cloudbeds.com/reference/createinvoice
4. https://developers.cloudbeds.com/reference/createreceipt
5. https://raw.githubusercontent.com/cloudbeds/openapi-specs/main/src/fiscal-document-v1.0-openapi.yaml
6. https://github.com/cloudbeds/cloudbeds-fiscal-document-python
