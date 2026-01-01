# Instalación v79: Módulo Histórico de Cajas

## Pasos de instalación

### 1. Descomprimir el ZIP
Descomprime `dist_v79_historico_cajas.zip` en tu servidor (ej: `/var/www/vhosts/tudominio.com/httpdocs/`)

### 2. Instalar dependencias
```bash
pnpm install --prod
```

### 3. Ejecutar migraciones SQL

**IMPORTANTE:** Debes ejecutar estos archivos SQL en tu base de datos MySQL/TiDB en el siguiente orden:

#### a) Crear la tabla (migration_v79.sql)
```bash
mysql -u tu_usuario -p tu_base_de_datos < migration_v79.sql
```

Este archivo crea la tabla `historical_cash_data` con la estructura necesaria.

#### b) Importar datos históricos (historical_data_import.sql)
```bash
mysql -u tu_usuario -p tu_base_de_datos < historical_data_import.sql
```

Este archivo importa los 287 registros de datos históricos (2014-2025) desde tu Excel.

### 4. Verificar la importación

Ejecuta esta consulta SQL para verificar que los datos se importaron correctamente:

```sql
SELECT 
  year,
  COUNT(*) as meses,
  SUM(hostel_z) as total_hostel,
  SUM(tienda_z) as total_tienda
FROM historical_cash_data
GROUP BY year
ORDER BY year;
```

Deberías ver:
- **287 registros totales**
- **12 meses por año** (2014-2025)
- Totales por año coincidiendo con tu Excel

### 5. Configurar variables de entorno

Asegúrate de que tu archivo `.env` contiene todas las variables necesarias (copia desde el servidor anterior o configura nuevamente).

### 6. Reiniciar la aplicación

```bash
pm2 restart hostel_app
```

O si usas el ecosystem.config.js:

```bash
pm2 start ecosystem.config.js
```

## Verificación

1. Accede a la aplicación como **administrador**
2. Ve al menú **"Histórico de Cajas"**
3. Verifica que:
   - La Vista Anual muestra datos para años 2014-2025
   - La Vista Gráficas muestra los gráficos correctamente
   - Los selectores funcionan (Por Años/Por Meses, filtros de datos)

## Notas importantes

- Los datos históricos (2014-2025) están importados desde tu Excel
- A partir de 2026, los datos se calcularán automáticamente desde la tabla `cash_closings`
- Solo los usuarios con rol **"admin"** pueden ver este módulo
- Si necesitas reimportar los datos, ejecuta nuevamente `historical_data_import.sql`

## Archivos incluidos

- `dist/` - Código compilado (frontend + backend)
- `drizzle/` - Migraciones de base de datos
- `migration_v79.sql` - SQL para crear la tabla
- `historical_data_import.sql` - SQL con los 287 registros históricos
- `package.json` - Dependencias del proyecto
- `ecosystem.config.js` - Configuración de PM2
- `uploads/` - Archivos subidos existentes
