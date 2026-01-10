# Formulario de Check-in Presencial - Captura

✅ **Formulario implementado exitosamente con todos los campos según normativa policial española**

## Secciones del formulario:

### 1. Header
- Nombre del hostel
- RTA (Registro de Turismo de Andalucía)

### 2. Información de Reserva
- Número de Reserva
- Habitación (selector con auto-completado de tipo)
- Tipo de Habitación (auto-completado)
- Fecha de Entrada *
- Fecha de Salida
- Número de Habitaciones
- Régimen (S.A., A.D., M.P., P.C.)
- Origen de Reserva (Walk In, Booking.com, Airbnb, etc.)
- Internet (checkbox)

### 3. Información de Pago * (OBLIGATORIA)
- Tipo de Pago * (Efectivo, Tarjeta, Plataforma, etc.)
- Fecha de Pago *
- Cantidad Abonada (€)
- Cantidad Pendiente (€)
- Titular del Pago
- Medio de Pago (Visa, Mastercard, PayPal, etc.)

### 4. Dirección (Compartida por todos los huéspedes) *
- Calle y Número *
- Información Adicional
- Código Postal
- Ciudad *
- Provincia
- País * (selector con códigos ISO alpha-3)

### 5. Huésped 1 (Principal)
- Nombre *
- Apellidos *
- Nacionalidad * (selector con opción "Otro")
- Tipo de Documento * (validado según nacionalidad)
  - Españoles: DNI o Pasaporte
  - Europeos: NIE o Pasaporte
  - No europeos: Solo Pasaporte
- Número de Documento *
- Sexo * (H, M, O)
- Fecha de Nacimiento *
- Fecha de Expedición
- Fecha de Caducidad
- Teléfono
- Email

### 6. Botón "Añadir Huésped"
- Permite añadir hasta 3 huéspedes por reserva

### 7. Firma del Huésped Principal *
- Canvas HTML5 para firma digital
- Botón "Borrar Firma"

### 8. Botón "Completar Check-in"
- Guarda todos los huéspedes con validación completa

## Validaciones implementadas:

✅ Fecha de entrada obligatoria
✅ Habitación obligatoria
✅ Tipo de pago obligatorio
✅ Fecha de pago obligatoria
✅ Datos completos de cada huésped
✅ Fecha de nacimiento obligatoria
✅ Nacionalidad obligatoria
✅ Campo libre cuando selecciona "Otro" en nacionalidad
✅ Dirección compartida completa
✅ Firma del huésped principal obligatoria
✅ Tipos de documento validados según nacionalidad

## Códigos oficiales XML implementados:

- **Tipos de documento**: NIF, NIE, PAS, OTRO
- **Sexo**: H, M, O
- **Tipos de pago**: EFECT, TARJT, PLATF, TRANS, MOVIL, TREG, DESTI, OTRO
- **Nacionalidad**: Códigos ISO alpha-3 (ESP, FRA, DEU, etc.)

Screenshot guardado en: `/home/ubuntu/screenshots/3000-iwf0ukvum8ase6b_2026-01-09_20-46-43_7887.webp`
