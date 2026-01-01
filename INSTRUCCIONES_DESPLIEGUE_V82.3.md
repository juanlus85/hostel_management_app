# Instrucciones de Despliegue v82.3

## ⚠️ IMPORTANTE - Limpiar caché

Esta versión incluye cambios importantes en el código JavaScript compilado. Debes limpiar la caché del navegador después de desplegar.

## Pasos de Despliegue

### 1. Subir archivos al servidor

```bash
# Descomprimir el ZIP en el directorio de la aplicación
cd /var/www/vhosts/tudominio.com/httpdocs
unzip -o v82.3_COMPLETO_*.zip
```

### 2. Verificar que los archivos se subieron correctamente

```bash
# Verificar que existe el nuevo archivo JavaScript
ls -la dist/public/assets/index-ArNG2EpJ-1767292834558.js

# Verificar que el HTML referencia el archivo correcto
grep "index-ArNG2EpJ" dist/public/index.html
```

### 3. Reiniciar la aplicación con PM2

```bash
pm2 restart hostel_app
# O si usas otro nombre:
pm2 restart all
```

### 4. Limpiar caché del navegador

**EN CADA NAVEGADOR QUE USES:**

- **Chrome/Edge**: Ctrl + Shift + R (Windows/Linux) o Cmd + Shift + R (Mac)
- **Firefox**: Ctrl + F5 (Windows/Linux) o Cmd + Shift + R (Mac)
- **Safari**: Cmd + Option + R (Mac)

**O manualmente:**
1. Abre las herramientas de desarrollador (F12)
2. Haz clic derecho en el botón de recargar
3. Selecciona "Vaciar caché y recargar de forma forzada"

### 5. Verificar que funciona

1. Abre la aplicación en el navegador
2. Verifica que aparece el menú "Histórico de Cajas"
3. Verifica que el Dashboard muestra €0.00 si no hay cierres de caja del mes actual
4. Abre la consola del navegador (F12) y verifica que no hay errores

## Qué incluye esta versión

- ✅ Módulo Histórico de Cajas (Vista Anual, Gráficas, Acumulados)
- ✅ Sistema de años dinámicos (2025, 2026, 2027...)
- ✅ Exportación XLSX en Cierre Trimestral
- ✅ Fix: Datos de Hostel en XLSX
- ✅ Fix: Dashboard con timezone correcto
- ✅ Todos los módulos anteriores (Caja, Facturas, Turnos, etc.)

## Solución de Problemas

### El menú "Histórico de Cajas" no aparece

**Causa**: El navegador está usando JavaScript antiguo cacheado

**Solución**:
1. Limpia la caché del navegador (Ctrl+Shift+R)
2. Si no funciona, cierra completamente el navegador y ábrelo de nuevo
3. Si aún no funciona, borra manualmente la caché:
   - Chrome: chrome://settings/clearBrowserData
   - Firefox: about:preferences#privacy

### El Dashboard muestra datos de diciembre en lugar de enero

**Causa**: Estás usando una versión antigua del código

**Solución**:
1. Verifica que subiste el ZIP correcto (v82.3_COMPLETO_*.zip)
2. Reinicia PM2: `pm2 restart hostel_app`
3. Limpia la caché del navegador (Ctrl+Shift+R)

### Los archivos no se actualizan

**Causa**: El servidor está sirviendo archivos antiguos

**Solución**:
1. Verifica que descomprimiste el ZIP con la opción `-o` (sobrescribir)
2. Verifica permisos: `chmod -R 755 dist/`
3. Reinicia el servidor web (Apache/Nginx) si es necesario

## Contacto

Si sigues teniendo problemas después de seguir estos pasos, envíame:
1. Captura de pantalla de la consola del navegador (F12 → Console)
2. Resultado de: `ls -la dist/public/assets/ | grep index`
3. Resultado de: `pm2 logs hostel_app --lines 50`
