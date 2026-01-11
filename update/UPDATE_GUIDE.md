# Guía de Actualización - Hostel Management System

## 📦 Contenido del Paquete

Este paquete contiene los archivos necesarios para actualizar tu instalación existente con el nuevo módulo de check-in:

- `dist/` - Código compilado (frontend + backend)
- `server/` - Código fuente del servidor
- `shared/` - Código compartido
- `drizzle/` - Schema de base de datos
- `checkin_tables.sql` - Script SQL para crear tablas de check-in
- `package.json` - Dependencias actualizadas

## 🚀 Pasos de Actualización

### 1. Backup (IMPORTANTE)

```bash
# Hacer backup de la base de datos
mysqldump -u tu_usuario -p tu_base_de_datos > backup_$(date +%Y%m%d_%H%M%S).sql

# Hacer backup de los archivos actuales
cd /ruta/a/tu/aplicacion
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz .
```

### 2. Detener la Aplicación

```bash
# Si usas PM2
pm2 stop hostel-app

# Si usas systemd
sudo systemctl stop hostel-app
```

### 3. Crear Tablas de Check-in

```bash
# Conectar a MySQL y ejecutar el script
mysql -u tu_usuario -p tu_base_de_datos < checkin_tables.sql

# Verificar que las tablas se crearon
mysql -u tu_usuario -p tu_base_de_datos -e "SHOW TABLES LIKE 'guests';"
mysql -u tu_usuario -p tu_base_de_datos -e "SHOW TABLES LIKE 'hostel_settings_checkin';"
```

### 4. Actualizar Archivos

```bash
# Descomprimir el paquete de actualización
cd /ruta/a/tu/aplicacion
tar -xzf hostel-app-update.tar.gz

# Copiar archivos compilados
cp -r update/dist/* dist/

# Copiar código fuente del servidor
cp -r update/server/* server/

# Copiar código compartido
cp -r update/shared/* shared/

# Copiar schema de BD
cp -r update/drizzle/* drizzle/

# Actualizar package.json
cp update/package.json .
```

### 5. Instalar Nuevas Dependencias

```bash
# Instalar dependencias actualizadas
pnpm install --prod

# O si usas npm
npm install --production
```

### 6. Crear Carpeta de Registros

```bash
# Crear carpeta para PDFs generados automáticamente
mkdir -p Registros
chmod 755 Registros
```

### 7. Reiniciar la Aplicación

```bash
# Si usas PM2
pm2 restart hostel-app

# Si usas systemd
sudo systemctl start hostel-app

# Verificar que está funcionando
pm2 logs hostel-app --lines 50
# O
sudo journalctl -u hostel-app -n 50 -f
```

### 8. Verificar Funcionamiento

```bash
# Verificar que el servidor responde
curl http://localhost:3000

# Verificar logs
pm2 logs hostel-app
```

## 🆕 Nuevas Funcionalidades

### Check-in Anticipado Público
- URL: `https://tu-dominio.com/checkin-anticipado`
- Los huéspedes pueden completar el check-in antes de llegar
- Email de confirmación automático bilingüe (ES/EN)

### Gestión de Check-ins
- **Menú**: Check-in → Gestión de Huéspedes
- Ver todos los huéspedes registrados
- Editar información de huéspedes
- Generar PDF de ficha de huésped
- Eliminar registros

### Exportación a Policía
- **Menú**: Check-in → Exportar Policía
- Generar XML compatible con sistema de Hospederías
- Selección múltiple de huéspedes
- Validación automática de datos obligatorios

### Generación Automática de PDFs
- Al completar un check-in se genera automáticamente un PDF
- Se guarda en la carpeta `Registros/`
- Formato: `DDMMAA - Nombre Cliente.pdf`

### Eliminación Automática
- Tarea programada que se ejecuta diariamente a las 3:00 AM
- Elimina huéspedes 3 días después de su check-in
- Conserva los PDFs en la carpeta `Registros/`

### Configuración del Hostel
- **Menú**: Check-in → Configuración
- Datos del establecimiento
- Términos y condiciones bilingües
- Personalización de colores
- Configuración de notificaciones

## ⚙️ Variables de Entorno

No se requieren nuevas variables de entorno. El sistema usa las existentes.

## 🔧 Configuración Post-Instalación

### 1. Configurar Datos del Establecimiento

1. Acceder a **Check-in → Configuración**
2. Completar:
   - Código del establecimiento (Hospederías)
   - Nombre y dirección
   - Teléfono y email
   - Términos y condiciones
   - Logo (opcional)

### 2. Configurar Habitaciones

1. Acceder a **Check-in → Códigos de Acceso**
2. Agregar habitaciones con sus códigos

### 3. Probar Check-in Anticipado

1. Abrir `https://tu-dominio.com/checkin-anticipado`
2. Completar formulario de prueba
3. Verificar email de confirmación
4. Verificar que aparece en **Gestión de Huéspedes**

## 📊 Estructura de Datos

### Tabla `guests`
Almacena toda la información de los huéspedes:
- Datos personales (nombre, documento, nacionalidad)
- Dirección completa
- Datos de reserva
- Información de habitación
- Datos de pago
- Firma digital
- Estado (pending/completed)

### Tabla `hostel_settings_checkin`
Configuración del sistema de check-in:
- Datos del establecimiento
- Términos y condiciones bilingües
- Personalización visual
- Configuración de notificaciones

## 🗑️ Limpieza Automática

El sistema elimina automáticamente:
- Huéspedes con más de 3 días desde su check-in
- Solo de la base de datos
- **Los PDFs se conservan** en `Registros/`

Para cambiar el número de días:
1. Acceder a la BD: `UPDATE hostel_settings_checkin SET autoDeleteDays = 7 WHERE id = 1;`
2. Reiniciar aplicación

## 🆘 Solución de Problemas

### Error: "Table 'guests' doesn't exist"
```bash
# Ejecutar el script SQL de nuevo
mysql -u tu_usuario -p tu_base_de_datos < checkin_tables.sql
```

### Error: "Cannot find module 'jspdf'"
```bash
# Reinstalar dependencias
pnpm install --prod
pm2 restart hostel-app
```

### Los PDFs no se generan
```bash
# Verificar permisos de la carpeta
chmod 755 Registros/
chown -R $USER:$USER Registros/

# Verificar logs
pm2 logs hostel-app | grep PDF
```

### La tarea de limpieza no se ejecuta
```bash
# Verificar que PM2 está configurado para auto-inicio
pm2 startup
pm2 save

# Verificar logs del cron
pm2 logs hostel-app | grep Cron
```

## 📞 Soporte

Para problemas técnicos o dudas sobre la actualización, contactar con el desarrollador.

## 📝 Notas Importantes

1. **Backup obligatorio** antes de actualizar
2. **No eliminar** la carpeta `Registros/` - contiene PDFs históricos
3. **Verificar** que la tarea de limpieza automática está funcionando
4. **Configurar** los datos del establecimiento antes de usar en producción
5. **Probar** el check-in anticipado público antes de compartir el enlace

## ✅ Checklist de Actualización

- [ ] Backup de base de datos realizado
- [ ] Backup de archivos realizado
- [ ] Aplicación detenida
- [ ] Tablas de check-in creadas
- [ ] Archivos actualizados
- [ ] Dependencias instaladas
- [ ] Carpeta Registros/ creada
- [ ] Aplicación reiniciada
- [ ] Funcionamiento verificado
- [ ] Datos del establecimiento configurados
- [ ] Habitaciones configuradas
- [ ] Check-in anticipado probado
- [ ] Email de confirmación recibido
- [ ] Exportación a Policía probada

---

**Versión**: v54-v55
**Fecha**: Enero 2026
