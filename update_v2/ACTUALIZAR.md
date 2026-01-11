# Guía de Actualización Simple - v87 a v95

## ⚠️ IMPORTANTE: Hacer Backup Primero

```bash
# 1. Backup de base de datos
mysqldump -u tu_usuario -p tu_base_de_datos > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Backup de archivos actuales
cd /ruta/a/tu/aplicacion
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz .
```

## 📦 Pasos de Actualización

### 1. Detener la Aplicación

```bash
pm2 stop hostel-app
```

### 2. Crear Tablas Nuevas de Check-in

```bash
# Ejecutar el script SQL
mysql -u tu_usuario -p tu_base_de_datos < checkin_tables.sql

# Verificar que se crearon
mysql -u tu_usuario -p tu_base_de_datos -e "SHOW TABLES LIKE 'guests';"
```

### 3. Reemplazar Archivos

```bash
# Ir a tu carpeta de aplicación
cd /ruta/a/tu/aplicacion

# Hacer backup de dist actual
mv dist dist_backup

# Copiar nuevo dist
cp -r /ruta/al/paquete/dist .

# Actualizar drizzle
cp -r /ruta/al/paquete/drizzle .

# Actualizar package.json
cp /ruta/al/paquete/package.json .
cp /ruta/al/paquete/pnpm-lock.yaml .
```

### 4. Instalar Nuevas Dependencias

```bash
pnpm install --prod
```

### 5. Crear Carpeta de Registros

```bash
mkdir -p Registros
chmod 755 Registros
```

### 6. Reiniciar Aplicación

```bash
pm2 restart hostel-app

# Ver logs para verificar
pm2 logs hostel-app --lines 50
```

## ✅ Verificación

1. Abrir tu aplicación en el navegador
2. Verificar que el menú "Check-in" aparece
3. Probar acceso a: `/checkin-anticipado`

## 🔙 Rollback (Si algo falla)

```bash
pm2 stop hostel-app

# Restaurar archivos
rm -rf dist
mv dist_backup dist

# Restaurar BD (si es necesario)
mysql -u tu_usuario -p tu_base_de_datos < backup_YYYYMMDD_HHMMSS.sql

pm2 restart hostel-app
```

## 📋 Estructura del Paquete

```
update_v2/
├── dist/                    # Código compilado (REEMPLAZAR)
├── drizzle/                 # Schema de BD (REEMPLAZAR)
├── package.json             # Dependencias (REEMPLAZAR)
├── pnpm-lock.yaml          # Lock file (REEMPLAZAR)
├── checkin_tables.sql      # Script SQL (EJECUTAR)
└── ACTUALIZAR.md           # Esta guía
```

## 🆕 Nuevas Funcionalidades

- **Check-in anticipado público**: `/checkin-anticipado`
- **Gestión de huéspedes**: Menú Check-in
- **Exportación a Policía**: XML compatible con Hospederías
- **PDFs automáticos**: Se generan en carpeta `Registros/`
- **Limpieza automática**: Elimina huéspedes después de 3 días

## 🆘 Si Algo Sale Mal

1. **No arranca el servidor**:
   ```bash
   pm2 logs hostel-app
   # Buscar el error específico
   ```

2. **Error de módulo no encontrado**:
   ```bash
   pnpm install --prod
   pm2 restart hostel-app
   ```

3. **Error de base de datos**:
   ```bash
   # Verificar que las tablas existen
   mysql -u tu_usuario -p tu_base_de_datos -e "SHOW TABLES;"
   ```

4. **Restaurar versión anterior**:
   ```bash
   pm2 stop hostel-app
   rm -rf dist
   mv dist_backup dist
   pm2 restart hostel-app
   ```

## 📞 Soporte

Si tienes problemas, envía:
1. Logs de PM2: `pm2 logs hostel-app --lines 100`
2. Error específico que aparece
3. Paso en el que falló
