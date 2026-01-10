# Códigos Oficiales SES.Hospedajes - Policía Nacional

Referencia de códigos según las instrucciones oficiales v1.2.0 del Ministerio del Interior.

## Tipos de Documento (tipoDocumento)

| Código | Descripción |
|--------|-------------|
| NIF    | NIF - Número de Identificación Fiscal (DNI español) |
| NIE    | NIE - Número de Identidad de Extranjero |
| PAS    | Número de pasaporte |
| OTRO   | Otro |

## Sexo (sexo)

| Código | Descripción |
|--------|-------------|
| H      | Hombre |
| M      | Mujer |
| O      | Otro |

## Tipos de Pago (tipoPago)

| Código | Descripción |
|--------|-------------|
| EFECT  | Efectivo |
| TARJT  | Tarjeta de crédito |
| PLATF  | Plataforma de pago |
| TRANS  | Transferencia |
| MOVIL  | Pago por móvil |
| TREG   | Tarjeta regalo |
| DESTI  | Pago en destino |
| OTRO   | Otros medios de pago |

## Relación de Parentesco (parentesco)

| Código | Descripción |
|--------|-------------|
| AB     | Abuelo/a |
| BA     | Bisabuelo/a |
| BN     | Bisnieto/a |
| CD     | Cuñado/a |
| CY     | Cónyuge |
| HR     | Hermano/a |
| HJ     | Hijo/a |
| PM     | Padre o madre |
| NI     | Nieto/a |
| SB     | Sobrino/a |
| SG     | Suegro/a |
| TI     | Tío/a |
| YN     | Yerno o nuera |
| TU     | Tutor/a |
| OT     | Otro |

## Roles (rol)

| Código | Descripción |
|--------|-------------|
| VI     | Viajero (debe haber al menos uno) |

## Campos Obligatorios XML

### Contrato
- `referencia`: Número de reserva
- `fechaContrato`: Fecha del contrato (YYYY-MM-DD+01:00)
- `fechaEntrada`: Fecha y hora de entrada (YYYY-MM-DDTHH:MM:SS.sss+01:00)
- `fechaSalida`: Fecha y hora de salida (YYYY-MM-DDTHH:MM:SS.sss+01:00)
- `numPersonas`: Número de personas
- `numHabitaciones`: Número de habitaciones
- `internet`: true/false

### Pago
- `tipoPago`: Código de tipo de pago (OBLIGATORIO)
- `fechaPago`: Fecha del pago (YYYY-MM-DD+01:00)
- `medioPago`: Descripción del medio de pago (Visa, Mastercard, etc.)
- `titular`: Nombre y apellidos del titular del pago
- `caducidadTarjeta`: MM/AAAA (solo si es tarjeta)

### Persona
- `rol`: VI (viajero)
- `nombre`: Nombre
- `apellido1`: Primer apellido (OBLIGATORIO)
- `apellido2`: Segundo apellido
- `tipoDocumento`: NIF, NIE, PAS, OTRO
- `numeroDocumento`: Número del documento
- `soporteDocumento`: Soporte del documento
- `fechaNacimiento`: Fecha de nacimiento (YYYY-MM-DD+01:00)
- `nacionalidad`: Código ISO alfa-3 (ESP, ARG, etc.)
- `sexo`: H, M, O

### Dirección
- `direccion`: Calle y número
- `direccionComplementaria`: Información adicional
- `codigoMunicipio`: 5 dígitos (SOLO si país es ESP)
- `nombreMunicipio`: Nombre del municipio (SOLO si país NO es ESP)
- `codigoPostal`: Código postal
- `pais`: Código ISO alfa-3 (ESP, ARG, etc.)

### Contacto
- `telefono`: Teléfono principal
- `telefono2`: Teléfono secundario (opcional)
- `correo`: Correo electrónico

### Parentesco
- `parentesco`: Código de parentesco (si viaja en grupo familiar)

## Notas Importantes

1. **Apellido2**: Aunque no es obligatorio en el XML, es recomendable incluirlo si está disponible
2. **Código de Municipio**: Solo para direcciones en España (ESP). Para otros países usar `nombreMunicipio`
3. **Nacionalidad**: Usar códigos ISO alfa-3 (3 letras): ESP, FRA, DEU, ITA, GBR, USA, etc.
4. **Formato de fechas**: 
   - Fecha simple: `YYYY-MM-DD+01:00`
   - Fecha con hora: `YYYY-MM-DDTHH:MM:SS.sss+01:00`
5. **Número de personas**: Debe coincidir con el número de elementos `<persona>` en el XML
6. **Rol VI obligatorio**: Debe haber al menos una persona con rol "VI" (viajero)
