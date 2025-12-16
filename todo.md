# Project TODO - Hostel & Tienda Management System

## Base de Datos y Configuración
- [x] Esquema de base de datos completo (usuarios, negocios, turnos, caja, facturas, inventario, incidencias, tareas)
- [x] Migración inicial de base de datos

## Autenticación y Usuarios
- [x] Sistema de login con JWT
- [x] Roles diferenciados (admin/empleado)
- [x] Gestión de usuarios (crear, editar, eliminar)
- [x] Permisos según rol

## Turnos y Calendario
- [x] Calendario visual de turnos por empleado
- [x] Crear/editar/eliminar turnos
- [x] Registro de entrada/salida
- [x] Cálculo automático de horas trabajadas
- [x] Vista de turnos simultáneos en ambos negocios

## Caja Diaria y Arqueos
- [x] Registro de ingresos/gastos por turno
- [x] Separación por negocio (Hostel/Tienda)
- [x] Cálculo automático de diferencias (Debe haber vs Hay vs Descuadre)
- [x] Arqueos diarios y semanales
- [x] Histórico de movimientos

## Facturas y Gastos
- [x] Captura de foto de factura/ticket
- [x] OCR automático para extraer datos (proveedor, fecha, base, IVA, total)
- [x] Validación manual de datos extraídos
- [x] Categorización de gastos
- [x] Búsqueda y filtros

## Inventario y Pedidos
- [x] Lista de productos con stock actual y mínimo
- [x] Alertas automáticas cuando stock < mínimo
- [ ] Generación de lista de compra semanal
- [ ] Historial de pedidos
- [x] Seguimiento de proveedores

## Incidencias y Tareas
- [x] Registro de incidencias diarias
- [x] Asignación de tareas a empleados
- [x] Prioridades y estados (pendiente, en progreso, completado)
- [x] Historial de incidencias

## Dashboard y Reportes
- [x] Resumen de ingresos vs gastos (semanal/mensual)
- [x] Horas trabajadas por empleado
- [x] Descuadres acumulados
- [ ] Gastos por proveedor
- [ ] Gráficos de tendencias
- [ ] Exportación a PDF/Excel

## Interfaz de Usuario
- [x] Diseño responsivo móvil/desktop
- [x] Navegación intuitiva con sidebar
- [x] Formularios rápidos para móvil
- [x] Tema moderno con colores de marca (azul/magenta)

## Pruebas y Documentación
- [x] Tests unitarios para funciones críticas
- [ ] Documentación de despliegue en VPS

