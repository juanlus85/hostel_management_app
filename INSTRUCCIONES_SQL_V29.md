# Instrucciones SQL para Despliegue v29

## ⚠️ IMPORTANTE
Ejecuta estos comandos SQL en tu servidor de producción **ANTES** de reiniciar la aplicación.

## 📋 Cambios de Base de Datos v29

### 1. Modificar enum de roles (agregar housekeeping)
```sql
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'housekeeping') NOT NULL DEFAULT 'user';
```

### 2. Crear tabla room_status
```sql
CREATE TABLE IF NOT EXISTS room_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roomNumber VARCHAR(10) NOT NULL,
  date VARCHAR(10) NOT NULL,
  status ENUM('checkout', 'continues', 'empty') NOT NULL,
  beds INT,
  notes TEXT,
  updatedBy INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_room_date (roomNumber, date)
);
```

### 3. Agregar campos de metadatos
```sql
-- Facturas
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updatedBy INT AFTER updatedAt;

-- Incidencias
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS updatedBy INT AFTER updatedAt;

-- Tareas
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updatedBy INT AFTER updatedAt;

-- Inventario
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS createdBy INT AFTER notes;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS updatedBy INT AFTER createdBy;
```

## 🔧 Pasos de Despliegue

1. **Conectar a tu base de datos MySQL** via phpMyAdmin, MySQL Workbench, o línea de comandos

2. **Ejecutar los comandos SQL** en el orden indicado arriba

3. **Verificar que no haya errores** en la ejecución

4. **Subir los archivos** del paquete v29 a tu servidor:
   - Reemplazar carpeta `dist/` completa
   - Mantener `uploads/` sin cambios

5. **Reiniciar la aplicación** en Plesk:
   ```bash
   pm2 restart hostel-management-app
   ```

## ✅ Verificación

Después del despliegue, verifica:

- [ ] El campo "Prepago Booking" está deshabilitado en caja de Tienda
- [ ] Existe la opción "Housekeeping" en el menú (solo para admin)
- [ ] El calendario muestra todos los días del mes
- [ ] Al añadir un turno, la fecha es correcta

## 🆘 Solución de Problemas

**Error: "Column 'updatedBy' already exists"**
- Esto es normal si ya ejecutaste las migraciones antes
- Puedes ignorar este error o quitar `IF NOT EXISTS` del comando

**Error: "Unknown column 'role' in 'field list'"**
- Asegúrate de ejecutar el ALTER TABLE de roles primero
- Verifica que la tabla `users` existe

**Error: "Table 'room_status' already exists"**
- La tabla ya fue creada anteriormente
- Puedes continuar con los siguientes pasos

## 📞 Soporte

Si encuentras problemas durante el despliegue, revisa:
1. Los logs de PM2: `pm2 logs hostel-management-app`
2. Los logs de MySQL en Plesk
3. La consola del navegador (F12) para errores de frontend
