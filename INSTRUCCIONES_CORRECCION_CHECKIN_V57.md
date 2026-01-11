# Corrección: Loading Infinito en Check-in (v57)

## 🔴 Problema Identificado

El menú de check-in se queda cargando infinitamente porque **faltan dos tablas críticas en la base de datos de producción**:

1. `guests` - Tabla para almacenar huéspedes
2. `hostel_settings_checkin` - Tabla para configuración del sistema de check-in

### Evidencia del Error

Errores 500 en consola del navegador:
```
TRPCClientError: Failed query: select `id`, `firstName`, `lastName`... 
from `hostel_settings_checkin` limit ?
```

---

## ✅ Solución: Crear las Tablas Faltantes

### Paso 1: Acceder a phpMyAdmin

1. Ir a: https://vps-206625-mix.servidor.hosting/phpMyAdmin/
2. Login con credenciales del servidor
3. Seleccionar base de datos: `hostel_management`

### Paso 2: Ejecutar Script SQL

1. Click en pestaña **"SQL"** (arriba)
2. Copiar TODO el contenido del archivo `SQL_CREAR_TABLAS_CHECKIN_V57.sql`
3. Pegar en el cuadro de texto
4. Click en botón **"Continuar"** (abajo a la derecha)

### Paso 3: Verificar Creación

Después de ejecutar el script, deberías ver:

```
✓ Tabla guests creada correctamente
✓ Tabla hostel_settings_checkin creada correctamente
✓ Configuración inicial insertada
```

### Paso 4: Verificar en Navegador

1. Ir a: https://management.thespotcentralhostel.com/checkin
2. Refrescar la página (F5 o Ctrl+R)
3. El menú de check-in debería cargar correctamente ahora

---

## 📝 Qué Hace el Script SQL

### 1. Crea tabla `guests`
- Almacena información de huéspedes
- Campos: nombre, apellidos, documento, nacionalidad, etc.
- Información de reserva: habitación, fechas, pago
- Estados: pending, completed, online, cancelled

### 2. Crea tabla `hostel_settings_checkin`
- Configuración del sistema de check-in
- Datos del hostel: nombre, dirección, RTA, etc.
- Configuración SMTP para envío de emails
- Términos y condiciones (español e inglés)
- Mensajes de bienvenida personalizados

### 3. Inserta Configuración Inicial
- Nombre: The Spot Central Hostel
- RTA: H/SE/01189
- Código INE: 41091 (Sevilla)
- Hora de checkout: 11:00
- Términos y condiciones básicos

---

## ⚠️ Importante

### Datos que DEBES Actualizar Después

Una vez creadas las tablas, ve a **Check-in → Config** y actualiza:

1. **Código de Policía** (policeCode)
   - Necesario para exportar XML a Sistema Hospedajes
   - Obtenerlo del portal de Policía Nacional

2. **Información del Hostel**
   - Teléfono real
   - Email real
   - Dirección completa

3. **Configuración SMTP** (opcional)
   - Solo si quieres enviar emails automáticos de check-in anticipado
   - Puedes dejarlo vacío por ahora

---

## 🔍 Troubleshooting

### Si sigue sin cargar después de ejecutar el script:

1. **Verificar que las tablas existen:**
   ```sql
   SHOW TABLES LIKE 'guests';
   SHOW TABLES LIKE 'hostel_settings_checkin';
   ```

2. **Verificar que hay configuración inicial:**
   ```sql
   SELECT * FROM hostel_settings_checkin LIMIT 1;
   ```
   Debe devolver 1 fila con los datos iniciales.

3. **Limpiar caché del navegador:**
   - Ctrl + Shift + Delete
   - Seleccionar "Caché" y "Cookies"
   - Eliminar

4. **Reiniciar aplicación en Plesk:**
   - Panel de Plesk → Node.js → Reiniciar app

---

## 📊 Estructura de las Tablas Creadas

### Tabla `guests` (51 columnas)
```
- Información personal: firstName, lastName, documentNumber, etc.
- Dirección: street, city, province, country, postalCode
- Contacto: phone, email
- Reserva: reservationNumber, roomNumber, checkInDate, checkOutDate
- Pago: paymentType, amountPaid, amountPending
- Estado: status (pending/completed/online/cancelled)
- Firma digital: signature (base64)
```

### Tabla `hostel_settings_checkin` (26 columnas)
```
- Datos hostel: hostelName, hostelAddress, hostelRta, policeCode
- Configuración: wifiPassword, checkoutTime, defaultEntranceCode
- Términos: termsConditionsEs, termsConditionsEn
- SMTP: smtpHost, smtpPort, smtpUser, smtpPassword
```

---

## 🎯 Resultado Esperado

Después de ejecutar el script SQL:

1. ✅ La página de check-in carga correctamente
2. ✅ Puedes ver el formulario de check-in presencial
3. ✅ Puedes acceder a todas las pestañas (Huéspedes, Anticipado, Policía, Config)
4. ✅ Puedes completar un check-in de prueba
5. ✅ Puedes ver la lista de huéspedes
6. ✅ Puedes exportar XML para policía

---

## 📞 Soporte

Si después de ejecutar el script sigue habiendo problemas:

1. Captura de pantalla de la consola del navegador (F12 → Console)
2. Captura de pantalla del resultado del script SQL en phpMyAdmin
3. Verifica que las tablas se crearon correctamente en phpMyAdmin

**Nota:** Este problema solo afecta a la base de datos de producción. El entorno de desarrollo ya tiene estas tablas creadas.
