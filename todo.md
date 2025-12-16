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


## Mejoras Solicitadas (v2)

### Caja
- [x] Caja automática sin apertura manual (se abre con saldo del día anterior)
- [x] Los días empiezan y terminan a las 6am
- [x] Corregir bug: botón "Abrir caja" no hace nada

### Calendario de Turnos
- [x] Vista mensual de todos los turnos
- [ ] Calendario base/plantilla para crear turnos automáticamente
- [ ] Cambiar turnos arrastrando (drag & drop)
- [x] Cambiar turnos haciendo click

### Empleados
- [x] Crear empleados manualmente como admin (nombre, correo, clave)
- [ ] Crear empleados iniciales: Ana y Juanlu
- [x] Dos perfiles: administrador y empleado

### Permisos por Rol
- [x] Empleados NO ven totales en dashboard
- [x] Solo admins pueden ver métricas financieras

### Incidencias y Tareas
- [x] Corregir bug: error al crear incidencia (dice que no existe título)
- [x] Poder modificar tareas/incidencias existentes

### Inventario
- [x] Corregir bug: error al crear producto en inventario

### Facturas
- [x] Permitir subir imagen o PDF
- [x] OCR integrado (usa LLM para extraer datos de imágenes)
- [x] Simplificar campos: solo total, nº factura, proveedor, forma de pago
- [x] Formas de pago: Cuenta Bancaria, Tarjeta, Ana, Juanlu, Caja Hostel, Caja Tienda, Caja Fuerte, Caja Fuerte Cambio, Otros

### Proveedores
- [x] Nuevo módulo de proveedores
- [x] Lista de proveedores para usar en inventario y facturas
- [x] Permitir añadir proveedor nuevo si no existe en lista


## Bugs Reportados (v3)

### Caja
- [x] Error al añadir ingreso: dice "Completa todos los campos" aunque estén rellenos
- [x] Error al añadir gasto: mismo problema

### Turnos
- [x] Cálculo de horas incorrecto: vista mensual no coincide con vista semanal

### Facturas
- [x] Error al registrar factura aunque todos los campos estén rellenos

### Inventario
- [x] Error "el nombre es obligatorio" aunque esté puesto
- [x] Simplificar: no requiere stock mínimo (es para indicar productos que faltan)


## Cambios Inventario (v4)

### Simplificar como Lista de Faltantes
- [x] Cambiar concepto: de "control de stock" a "lista de productos que faltan"
- [x] Quitar stock mínimo completamente
- [x] Campo principal: nombre del producto y unidades que quedan
- [x] Añadir botón de eliminar cuando llegue el pedido
- [x] Permitir editar cantidad
- [x] Interfaz más simple y directa


## Rediseño Caja (v5)

### Cierre de Caja Detallado
- [x] Desglose de monedas: 0.10€, 0.20€, 0.50€, 1€, 2€
- [x] Desglose de billetes: 5€, 10€, 20€, 50€
- [x] Campo para tarjetas (Tjtas)
- [x] Campo para Z de cada caja
- [x] Cambio anterior automático (del cierre del día anterior)
- [x] Entradas/salidas de efectivo con descripción
- [x] Prepago Booking
- [x] Retirado Efectivo
- [x] Retirado Tarjetas
- [x] Cálculo automático de descuadre
- [x] Todo editable
- [x] Separación Hostel/Tienda

### Exportación y Acceso a Datos
- [x] Exportación a CSV descargable
- [x] Datos accesibles en MySQL directamente
- [x] Histórico de cierres consultable
