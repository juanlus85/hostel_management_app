# ✅ Checklist de Despliegue

## Antes de Desplegar

### En Manus (Preparación)

- [ ] Todas las funciones probadas y funcionando

- [ ] Ejecutar `./prepare-deploy.sh` para generar el paquete

- [ ] Descargar `hostel-management-deploy.zip`

- [ ] Descomprimir el ZIP en tu máquina local

### En Plesk (Configuración Inicial)

- [ ] Crear subdominio: `management.thespotcentralhostel.com`

- [ ] Activar Node.js versión 18 o superior

- [ ] Activar SSL con Let's Encrypt

- [ ] Configurar redirección HTTP → HTTPS

- [ ] Crear base de datos MySQL: `hostel_management`

- [ ] Crear usuario de BD: `hostel_admin` con contraseña segura

- [ ] Anotar credenciales de la base de datos

---

## Durante el Despliegue

### 1. Subir Archivos

- [ ] Conectar via SFTP o usar File Manager de Plesk

- [ ] Subir TODO el contenido de `deploy-package/` a `/httpdocs/`

- [ ] Verificar que existe: `dist/`, `drizzle/`, `package.json`, etc.

### 2. Configurar Variables de Entorno

**Opción A: Archivo .env**

- [ ] Copiar `.env.example` a `.env`

- [ ] Editar `.env` con tus credenciales:

   - [ ] `DATABASE_URL` (con datos de Plesk )

   - [ ] `JWT_SECRET` (generar con `openssl rand -base64 32`)

   - [ ] `VITE_APP_TITLE`

   - [ ] Otras variables según necesites

**Opción B: Panel de Plesk**

- [ ] Ir a: Node.js > Environment Variables

- [ ] Añadir cada variable manualmente

### 3. Instalar Dependencias

```bash
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs/
pnpm install --production
```

- [ ] Ejecutado sin errores

### 4. Ejecutar Migraciones

```bash
pnpm db:push
```

- [ ] Tablas creadas en la base de datos

- [ ] Sin errores de conexión

### 5. Configurar Node.js en Plesk

- [ ] Application root: `/httpdocs`

- [ ] Application startup file: `dist/server/index.js`

- [ ] Application mode: `Production`

- [ ] Document root: `/httpdocs`

- [ ] Click en "Enable Node.js"

- [ ] Click en "Restart"

**O configurar PM2:**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

- [ ] PM2 iniciado correctamente

- [ ] Aplicación corriendo

---

## Verificación Post-Despliegue

### Pruebas Básicas

- [ ] La página carga: `https://management.thespotcentralhostel.com`

- [ ] No hay errores 502/503

- [ ] El certificado SSL funciona (candado verde )

- [ ] La página de login aparece correctamente

### Pruebas de Funcionalidad

- [ ] Login funciona

- [ ] Dashboard carga con datos

- [ ] Crear un turno de prueba

- [ ] Registrar un movimiento de caja

- [ ] Crear una factura

- [ ] Verificar que el email de factura llega

- [ ] Subir un archivo (foto de factura)

- [ ] Ver el inventario

- [ ] Crear una incidencia

### Pruebas de Rendimiento

- [ ] La app carga en menos de 3 segundos

- [ ] Las imágenes cargan correctamente

- [ ] No hay errores en la consola del navegador

---

## Solución de Problemas

### ❌ Error 502 Bad Gateway

**Causa:** La aplicación Node.js no está corriendo **Solución:**

```bash
# Ver logs
pm2 logs hostel-management
# O en Plesk: Node.js > View Logs

# Reiniciar
pm2 restart all
# O en Plesk: Node.js > Restart
```

### ❌ Error de conexión a base de datos

**Causa:** DATABASE_URL incorrecta **Solución:**

- Verificar usuario, password, host, puerto, nombre de BD

- Verificar que el usuario tiene permisos

- Probar conexión: `mysql -u hostel_admin -p hostel_management`

### ❌ Archivos estáticos no cargan (CSS/JS)

**Causa:** Ruta incorrecta o permisos **Solución:**

- Verificar que `dist/client/` existe

- Verificar permisos: `chmod -R 755 dist/`

- Limpiar caché del navegador

### ❌ Variables de entorno no se leen

**Causa:** .env no está en la raíz o Plesk no las carga **Solución:**

- Verificar que `.env` está en `/httpdocs/.env`

- O configurar en Plesk: Node.js > Environment Variables

- Reiniciar la aplicación

---

## Mantenimiento

### Actualizar la Aplicación

- [ ] Hacer cambios en Manus

- [ ] Probar en Manus

- [ ] Ejecutar `./prepare-deploy.sh`

- [ ] Descargar nuevo ZIP

- [ ] Hacer backup del servidor actual

- [ ] Subir nuevos archivos

- [ ] Ejecutar `pnpm db:push` si hay cambios en BD

- [ ] Reiniciar: `pm2 restart all`

### Backup Regular

- [ ] Backup de base de datos (semanal )

- [ ] Backup de archivos subidos (semanal)

- [ ] Backup de `.env` (guardar en lugar seguro)

### Monitoreo

- [ ] Revisar logs semanalmente

- [ ] Verificar espacio en disco

- [ ] Verificar que los emails llegan

- [ ] Verificar certificado SSL (renovación automática)

---

## Contactos de Soporte

- **Plesk:** Soporte de tu proveedor de hosting

- **Node.js:** [https://nodejs.org/docs](https://nodejs.org/docs)

- **PM2:** [https://pm2.keymetrics.io/docs](https://pm2.keymetrics.io/docs)

---

## Notas

- Guarda este checklist para futuras actualizaciones

- Documenta cualquier cambio que hagas

- Mantén una copia de seguridad de las credenciales

