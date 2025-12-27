# Instrucciones de Despliegue v27 - Almacenamiento Local

## 🔍 Problema Resuelto

Los adjuntos en emails de facturas no funcionaban en producción porque el código dependía de variables de entorno de S3 que solo existen en el entorno de Manus (`BUILT_IN_FORGE_API_URL` y `BUILT_IN_FORGE_API_KEY`).

**Solución:** Almacenamiento local de archivos en el servidor VPS.

---

## 📋 Cambios Implementados en v27

### 1. **Almacenamiento Local** (`server/routers.ts`)
- Los archivos se guardan en `/httpdocs/uploads/invoices/`
- No se requieren variables de entorno adicionales
- Genera nombres únicos con timestamp + sufijo aleatorio

### 2. **Lectura de Archivos** (`server/email.ts`)
- Lee archivos directamente desde el disco local
- Soporta tanto rutas locales (`/uploads/...`) como URLs externas
- Adjunta el archivo al email desde el buffer local

### 3. **Servir Archivos Estáticos** (`server/_core/vite.ts`)
- Express sirve la carpeta `/uploads` como archivos estáticos
- Los archivos son accesibles vía HTTP en `/uploads/invoices/nombre.pdf`

---

## 🚀 Pasos para Desplegar en tu Servidor VPS

### Paso 1: Subir Archivos Actualizados

Sube **SOLO** estos archivos a tu servidor (reemplaza los existentes):

```
/httpdocs/dist/server/index.js          ← Backend compilado con cambios
/httpdocs/dist/client/                  ← Frontend compilado (sin cambios)
```

### Paso 2: Crear Carpeta de Uploads

Conéctate a tu servidor via SSH y ejecuta:

```bash
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs
mkdir -p uploads/invoices
chmod 755 uploads
chmod 755 uploads/invoices
```

**Importante:** La carpeta `uploads/` debe estar en la raíz de tu aplicación (`/httpdocs/uploads/`), NO dentro de `dist/`.

### Paso 3: Verificar Permisos

Asegúrate de que el usuario de Node.js tenga permisos de escritura:

```bash
chown -R <tu_usuario>:<tu_grupo> uploads/
# Por ejemplo: chown -R thespotc:psacln uploads/
```

Para saber tu usuario, ejecuta:
```bash
whoami
```

### Paso 4: Reiniciar la Aplicación

**Opción A - Desde Plesk:**
1. Ve a: **Dominios > management.thespotcentralhostel.com > Node.js**
2. Click en **"Restart App"**

**Opción B - Via SSH con PM2:**
```bash
pm2 restart hostel-management-app
pm2 logs hostel-management-app --lines 50
```

### Paso 5: Probar la Funcionalidad

1. Crea una nueva factura con archivo adjunto
2. Verifica que el archivo se guardó:
   ```bash
   ls -lh /var/www/vhosts/.../httpdocs/uploads/invoices/
   ```
3. Revisa tu email en `thespotcentralhostel@gmail.com`
4. Confirma que el PDF llegó adjunto

---

## 🔍 Verificación y Troubleshooting

### Verificar que la carpeta se creó correctamente:
```bash
ls -ld /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs/uploads/invoices/
```

Deberías ver algo como:
```
drwxr-xr-x 2 usuario grupo 4096 Dec 17 08:00 uploads/invoices/
```

### Ver logs del servidor:
```bash
pm2 logs hostel-management-app --lines 100
```

Busca estos mensajes:
- `[Server] Serving uploads from: /var/www/.../uploads`
- `[Upload] File saved locally: /var/www/.../uploads/invoices/xxxxx.pdf`
- `[Email] Reading local file: /var/www/.../uploads/invoices/xxxxx.pdf`
- `[Email] Read local file: XXXX bytes`

### Si los archivos no se guardan:
1. Verifica permisos de la carpeta `uploads/`
2. Verifica que el usuario de Node.js tenga permisos de escritura
3. Revisa los logs para ver errores específicos

### Si el email no llega con adjunto:
1. Verifica que el archivo existe en `uploads/invoices/`
2. Revisa los logs para ver si hay errores al leer el archivo
3. Verifica la configuración SMTP en Configuración > SMTP

---

## 📦 Archivos Modificados

- `server/routers.ts` - Procedimiento `uploadFile` usa almacenamiento local
- `server/email.ts` - Función `sendEmailWithAttachment` lee archivos locales
- `server/_core/vite.ts` - Sirve `/uploads` como archivos estáticos

---

## ⚠️ Notas Importantes

1. **NO necesitas** agregar nuevas variables de entorno
2. **NO necesitas** ejecutar migraciones de base de datos
3. **NO necesitas** reinstalar dependencias
4. **SÍ necesitas** crear la carpeta `uploads/invoices/` manualmente
5. **SÍ necesitas** verificar permisos de escritura

---

## 🎯 Resultado Esperado

Después del despliegue:
- ✅ Los archivos de facturas se guardan en `/httpdocs/uploads/invoices/`
- ✅ Los emails se envían con el PDF adjunto correctamente
- ✅ No dependes de servicios externos (S3)
- ✅ Todo funciona en tu servidor VPS sin configuración adicional

---

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs: `pm2 logs hostel-management-app`
2. Verifica permisos: `ls -ld uploads/invoices/`
3. Comprueba que los archivos se guardan: `ls -lh uploads/invoices/`
