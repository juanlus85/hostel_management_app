# Instrucciones de Despliegue v57 - CORREGIDO

## ✅ Cambios en esta versión

### Problema Resuelto
- **v56 NO arrancaba en producción** - El servidor no cargaba nada
- **Causa:** Código de cron automático que causaba conflictos
- **Solución:** Rollback a v53 (última versión estable) + agregar solo botón manual

### Funcionalidades Implementadas
1. ✅ **Endpoint manual de limpieza** (`checkin.cleanupOldGuests`)
   - Elimina huéspedes con más de 3 días desde check-in
   - Conserva PDFs en carpeta `Registros/`
   - Se ejecuta solo cuando el usuario lo solicita

2. ✅ **Botón en interfaz** (vista Exportar Policía)
   - Botón rojo "Limpiar Registros Antiguos (+3 días)"
   - Confirmación obligatoria antes de ejecutar
   - Loading spinner mientras se ejecuta
   - Mensaje de éxito con cantidad eliminada

3. ✅ **Sin código de cron**
   - NO usa node-cron
   - NO intenta ejecutar tareas automáticas
   - Compatible con servidor VPS

---

## 📦 Archivos Incluidos

```
hostel_app_v57_limpieza_manual_CORREGIDO.zip (1.1 MB)
├── dist/
│   ├── index.js (198.5 KB) ← Servidor compilado
│   └── public/ ← Frontend compilado
├── drizzle/ ← Migraciones de base de datos
├── uploads/ ← Carpeta para archivos subidos
└── package.json ← Dependencias
```

---

## 🚀 Pasos de Despliegue en Plesk

### 1. Backup de la versión actual
```bash
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs
cp -r . ../backup_antes_v57/
```

### 2. Subir y descomprimir v57
```bash
# Subir hostel_app_v57_limpieza_manual_CORREGIDO.zip a httpdocs/
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs
unzip -o hostel_app_v57_limpieza_manual_CORREGIDO.zip
```

### 3. Verificar estructura de carpetas
```bash
ls -la
# Debe mostrar:
# - dist/
# - drizzle/
# - uploads/
# - package.json
# - Registros/ (si existe de versión anterior)
```

### 4. Instalar dependencias
```bash
npm install --production
```

### 5. Reiniciar aplicación en Plesk
- Panel de Plesk → Node.js → Reiniciar app
- O desde SSH:
```bash
pm2 restart hostel-app
# o
pm2 restart all
```

### 6. Verificar que arranca correctamente
```bash
pm2 logs hostel-app --lines 20
# Debe mostrar:
# [OAuth] Initialized with baseURL: https://api.manus.im
# [Server] Serving uploads from: ...
# Server running on http://localhost:3000/
```

### 7. Probar en navegador
- Abrir: https://management.thespotcentralhostel.com
- Verificar que carga correctamente
- Ir a Check-in → Exportar Policía
- Verificar que aparece el botón rojo "Limpiar Registros Antiguos (+3 días)"

---

## ✅ Verificación Post-Despliegue

### Checklist
- [ ] La aplicación carga correctamente
- [ ] El botón de limpieza aparece en Exportar Policía
- [ ] Al hacer click en el botón aparece confirmación
- [ ] La limpieza funciona correctamente
- [ ] Los PDFs se conservan en carpeta Registros/

---

## 🔧 Troubleshooting

### Si el servidor no arranca:
```bash
# Ver logs detallados
pm2 logs hostel-app --lines 50

# Verificar que el archivo dist/index.js existe
ls -lh dist/index.js
# Debe mostrar: 198.5 KB

# Verificar Node.js version
node --version
# Debe ser v18 o superior
```

### Si aparece error de módulos:
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install --production
pm2 restart hostel-app
```

### Si la carpeta uploads/ no existe:
```bash
mkdir -p uploads/invoices
chmod 755 uploads
chmod 755 uploads/invoices
```

---

## 📝 Notas Importantes

1. **Esta versión NO tiene cron automático**
   - La limpieza se hace manualmente desde la interfaz
   - No depende de node-cron ni tareas programadas

2. **Base de código estable**
   - Basada en v53 que funcionaba correctamente
   - Solo se agregó el botón de limpieza manual
   - Sin cambios en el servidor principal

3. **Compatibilidad**
   - Compatible con Node.js 18+
   - Compatible con MySQL/MariaDB
   - Compatible con Plesk y PM2

---

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs: `pm2 logs hostel-app`
2. Verifica que el archivo dist/index.js tiene 198.5 KB
3. Compara con la versión v87 que funcionaba (170 KB)

**Diferencia clave:** v57 tiene el sistema de check-in completo + botón de limpieza manual, pero sin cron automático.
