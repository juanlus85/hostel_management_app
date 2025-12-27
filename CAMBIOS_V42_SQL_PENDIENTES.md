# Cambios v42 - SQL Pendientes para Producción

## ✅ Cambios implementados

### 1. Renombrar archivos de facturas
- Formato: `[Proveedor] - [Trimestre]T YYYY - [Fecha].pdf`
- Ejemplo: `Coca Cola - 4T 2025 - 151225.pdf`
- Se aplica automáticamente al subir facturas

### 2. Cierre trimestral incluye último día
- Ya corregido en versión anterior
- Usa formato local en lugar de UTC para evitar desfase

### 3. Otros Gastos → Gastos/Ingresos
- Nuevo campo `type` (gasto/ingreso)
- Selector en formulario
- Visualización con colores (rojo=gasto, verde=ingreso)
- Dashboard suma gastos a expenses e ingresos a income
- Menú renombrado a "Gastos/Ingresos"

### 4. Bug de Caja corregido
- Los valores ya no se resetean al cambiar de pestaña

### 5. Selector "Ambos" funciona en:
- Facturas
- Otros Gastos/Ingresos
- Incidencias
- Inventario

---

## 🔴 SQL PENDIENTE DE EJECUTAR EN PRODUCCIÓN

Ejecuta estos SQL en phpMyAdmin **EN ESTE ORDEN**:

### 1. Agregar campo `type` a `otros_gastos`
```sql
ALTER TABLE `otros_gastos` 
ADD COLUMN `type` enum('gasto','ingreso') NOT NULL DEFAULT 'gasto'
AFTER `businessId`;
```

---

## ⏳ Tareas pendientes (para próxima iteración)

### 3. Dashboard con selector de fechas personalizado
- Agregar opción "Mes anterior"
- Agregar selector de rango custom (fecha inicio - fecha fin)

### 5. Nuevo menú "Resumen Semanal"
- Dinero retirado efectivo/tarjeta por día
- Ingresos y gastos por negocio
- Balance semanal
- Resumen de incidencias pendientes
- Productos con stock bajo
- Tareas pendientes

---

## 📝 Notas

- Después de ejecutar el SQL, reinicia PM2
- Los gastos existentes se marcarán como "gasto" por defecto
- Si quieres convertir algún registro a "ingreso", edítalo desde la interfaz
