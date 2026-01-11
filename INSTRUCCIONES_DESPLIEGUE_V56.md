# Instrucciones de Despliegue v56 - Limpieza Manual de Registros

## 🎯 Cambios en esta versión

### ✅ Eliminado código de cron automático
- El servidor ya no intenta usar `node-cron` (no disponible en VPS)
- Eliminada la tarea programada que se ejecutaba a las 3:00 AM

### ✅ Agregado sistema de limpieza manual
- Nuevo endpoint `checkin.cleanupOldGuests` en el backend
- Botón "Limpiar Registros Antiguos (+3 días)" en la interfaz
- Los PDFs generados se conservan en la carpeta `Registros/`

---

## 📦 Archivos incluidos

- `hostel_app_v56_manual_cleanup.zip` (1.1 MB)
- `INSTRUCCIONES_DESPLIEGUE_V56.md` (este archivo)

---

## 🚀 Pasos de despliegue

### 1. Conectar al servidor VPS por FTP/SFTP

**Datos de conexión:**
- Host: Tu servidor VPS
- Puerto: 21 (FTP) o 22 (SFTP)
- Usuario: Tu usuario
- Contraseña: Tu contraseña

### 2. Subir archivos al servidor

1. Navega a la carpeta de la aplicación en el servidor
2. Haz backup de la carpeta `dist/` actual (por si necesitas rollback)
3. Descomprime `hostel_app_v56_manual_cleanup.zip` localmente
4. Sube la carpeta `dist/` completa al servidor (reemplaza la existente)

### 3. Reiniciar la aplicación

**Opción A - Con PM2:**
```bash
pm2 restart hostel-app
```

**Opción B - Con Plesk:**
1. Ve a "Sitios web y dominios"
2. Encuentra tu aplicación Node.js
3. Haz clic en "Restart App"

### 4. Verificar que funciona

1. Abre la aplicación en el navegador
2. Ve a **Check-in → Policía**
3. Verifica que aparece el botón "Limpiar Registros Antiguos (+3 días)" a la izquierda del botón "Descargar XML"

---

## 🧪 Cómo usar la limpieza manual

### Cuándo usar este botón:
- Cuando tengas muchos registros antiguos acumulados
- Después de exportar el XML a la policía
- Cuando quieras liberar espacio en la base de datos

### Qué hace el botón:
1. Elimina todos los huéspedes con más de 3 días desde su check-in
2. **Conserva los PDFs generados** en la carpeta `Registros/`
3. Muestra un mensaje de confirmación antes de ejecutar

### Pasos para ejecutar:
1. Ve a **Check-in → Policía**
2. Haz clic en el botón rojo "Limpiar Registros Antiguos (+3 días)"
3. Confirma la acción en el diálogo
4. Espera a que termine (verás un spinner)
5. La lista de huéspedes se actualizará automáticamente

---

## ⚠️ Importante

### ✅ Los PDFs se conservan
Los archivos PDF generados en la carpeta `Registros/` **NO se eliminan**. Solo se borran los registros de la base de datos.

### ✅ Criterio de eliminación
Se eliminan huéspedes cuya fecha de check-in sea **más de 3 días anterior** a la fecha actual.

**Ejemplo:**
- Hoy: 10 de enero
- Se eliminan: huéspedes con check-in del 6 de enero o anterior
- Se conservan: huéspedes con check-in del 7, 8, 9 o 10 de enero

### ✅ Acción irreversible
Una vez eliminados, los registros no se pueden recuperar desde la interfaz. Solo quedarán los PDFs en la carpeta `Registros/`.

---

## 🔄 Rollback (si algo falla)

Si después del despliegue algo no funciona:

1. Detén la aplicación
2. Restaura el backup de la carpeta `dist/` anterior
3. Reinicia la aplicación
4. Contacta para soporte

---

## 📝 Notas técnicas

### Backend (server/routers.ts)
```typescript
cleanupOldGuests: protectedProcedure.mutation(async () => {
  const result = await cleanupOldGuests();
  return { success: true, deletedCount: result.deletedCount };
})
```

### Frontend (ExportarPolicia.tsx)
- Botón con confirmación obligatoria
- Loading spinner durante ejecución
- Toast de éxito/error
- Recarga automática de la lista

### Función de limpieza (server/utils/cleanupOldGuests.ts)
- Calcula fecha límite: hoy - 3 días
- Elimina registros con `checkInDate < fechaLimite`
- Conserva PDFs en carpeta `Registros/`

---

## ✅ Checklist de verificación

Después del despliegue, verifica:

- [ ] La aplicación arranca sin errores
- [ ] El botón "Limpiar Registros Antiguos" aparece en Check-in → Policía
- [ ] El botón muestra confirmación al hacer clic
- [ ] La limpieza se ejecuta correctamente
- [ ] Los PDFs se conservan en la carpeta Registros/
- [ ] La lista de huéspedes se actualiza después de limpiar
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores en los logs del servidor

---

## 🆘 Soporte

Si tienes problemas con el despliegue:

1. Revisa los logs del servidor: `pm2 logs hostel-app`
2. Revisa la consola del navegador (F12)
3. Verifica que la carpeta `dist/` se subió correctamente
4. Verifica que la aplicación se reinició después de subir archivos

---

**Versión:** v56  
**Fecha:** 10 de enero de 2026  
**Tamaño del paquete:** 1.1 MB
