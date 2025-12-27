# 🔄 Cómo Actualizar tu Servidor Plesk

## Resumen de Cambios (v23)

Esta actualización corrige **5 bugs críticos** reportados en producción:

1. ✅ **Cerrar caja** - Ahora funciona correctamente
2. ✅ **Calendario mensual** - Los turnos aparecen en el día correcto (sin desplazamiento)
3. ✅ **Crear facturas** - Validación mejorada con mensajes claros
4. ✅ **Crear incidencias** - Validación separada para título y negocio
5. ✅ **Inventario** - Validación mejorada con mensajes de ayuda

---

## 📥 Paso 1: Descargar el Paquete

Ya tienes el archivo **hostel-management-deploy.zip** descargado.

---

## 🔧 Paso 2: Conectar a tu Servidor

**Opción A: File Manager de Plesk (Más fácil)**
1. Inicia sesión en Plesk
2. Ve a tu dominio: `management.thespotcentralhostel.com`
3. Click en "Files" o "Archivos"

**Opción B: SFTP (Más rápido)**
1. Usa FileZilla o WinSCP
2. Conecta a tu servidor con las credenciales de Plesk

---

## 📤 Paso 3: Hacer Backup (IMPORTANTE)

Antes de actualizar, **guarda una copia de seguridad**:

1. En Plesk File Manager, descarga la carpeta actual `/httpdocs/` a tu computadora
2. O renómbrala a `/httpdocs_backup_20251217/`

**¿Por qué?** Por si algo sale mal, puedes restaurar la versión anterior.

---

## 🚀 Paso 4: Subir los Archivos Nuevos

### Método 1: Reemplazar todo (Recomendado)

1. **Descomprime** `hostel-management-deploy.zip` en tu computadora
2. **Sube TODO el contenido** de la carpeta `deploy-package/` a `/httpdocs/`
3. **Sobrescribe** los archivos cuando te lo pida

### Método 2: Actualizar solo lo necesario (Avanzado)

Si prefieres actualizar solo los archivos modificados:

**Archivos que DEBES reemplazar:**
```
/httpdocs/dist/client/assets/index-CnwmWAex.js    ← Frontend con correcciones
/httpdocs/dist/client/assets/index-CBwKck8Q.css   ← CSS actualizado
/httpdocs/dist/client/index.html                  ← HTML actualizado
/httpdocs/dist/server/index.js                    ← Backend con correcciones
```

**Archivos que NO debes tocar:**
```
/httpdocs/.env                    ← Tus credenciales actuales
/httpdocs/drizzle/migrations/     ← No hay cambios en BD
```

---

## 🔄 Paso 5: Reiniciar la Aplicación

Después de subir los archivos, **reinicia** la aplicación:

**Opción A: Panel de Plesk**
1. Ve a: `Node.js` en el panel de tu dominio
2. Click en **"Restart"**

**Opción B: SSH con PM2**
```bash
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs/
pm2 restart hostel-management
```

---

## ✅ Paso 6: Verificar que Funciona

Abre tu navegador y prueba:

1. **Caja**: Ve a Caja → Llena los datos → Click en "Cerrar Caja" → Debe cerrarse correctamente
2. **Turnos**: Ve a Turnos → Pestaña "Mensual" → Verifica que los turnos aparecen en el día correcto
3. **Facturas**: Ve a Facturas → "Nueva factura" → Si no hay negocio seleccionado, debe aparecer mensaje de ayuda
4. **Incidencias**: Ve a Incidencias → "Nueva incidencia" → Debe validar correctamente
5. **Inventario**: Ve a Inventario → "Añadir producto" → Debe validar correctamente

---

## 🆘 Si Algo Sale Mal

### Error 502 Bad Gateway

**Causa:** La aplicación no está corriendo

**Solución:**
```bash
# Ver logs
pm2 logs hostel-management

# Reiniciar
pm2 restart hostel-management
```

### La página carga pero los cambios no se ven

**Causa:** Caché del navegador

**Solución:**
1. Presiona `Ctrl + Shift + R` (Windows/Linux) o `Cmd + Shift + R` (Mac)
2. O limpia la caché del navegador

### Los archivos no se suben

**Causa:** Permisos incorrectos

**Solución:**
```bash
# Conecta por SSH y ejecuta:
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/
chmod -R 755 httpdocs/
```

---

## 📝 Notas Importantes

- **No necesitas** ejecutar `pnpm db:push` porque no hay cambios en la base de datos
- **No necesitas** modificar el archivo `.env`
- **Los datos** de tu base de datos NO se verán afectados
- **Las imágenes** subidas (facturas, etc.) NO se verán afectadas

---

## 🎯 Resumen Rápido

```bash
# 1. Hacer backup
# 2. Descomprimir hostel-management-deploy.zip
# 3. Subir contenido de deploy-package/ a /httpdocs/
# 4. Reiniciar: pm2 restart hostel-management
# 5. Probar: https://management.thespotcentralhostel.com
```

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas durante la actualización, avísame y te ayudo a resolverlo.

---

**Última actualización:** 17 de diciembre de 2025  
**Versión:** v23 - Corrección de bugs de producción
