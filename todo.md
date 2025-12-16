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
- [x] Calendario base/plantilla para crear turnos automáticamente
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


## Mejoras Caja (v6)

### Cambio para Mañana
- [x] Por defecto = total efectivo (no manual)
- [x] Sigue siendo editable si se quiere cambiar

### Reabrir Caja
- [x] Botón para reabrir caja cerrada
- [x] Permitir editar datos después de reabrir

### Cierre Trimestral
- [x] Nuevo módulo de cierre por trimestres
- [x] Flexible: cerrar en cualquier fecha después de terminar el trimestre
- [x] Descarga CSV del trimestre:
  - [x] Cierres de caja
  - [x] Facturas
  - [x] Resumen
- [x] Resumen del trimestre (ingresos, gastos, balance)


## Bugs Reportados (v7)

### Caja - Cambio para mañana
- [x] El campo "Cambio para mañana" no muestra el total efectivo por defecto (muestra 0.00)
- [x] Debe mostrar automáticamente el valor del Total Efectivo calculado

### Caja - Cambio anterior
- [x] El día siguiente no hereda el "cambio para mañana" del día anterior
- [x] Empieza siempre a 0 en lugar de usar el valor guardado

### Dashboard
- [x] Los ingresos de la semana no coinciden con los datos reales
- [x] Revisar la lógica de cálculo de métricas


## Bug Corregido (v8)

### Cambio Anterior
- [x] El cambio anterior ahora se actualiza automáticamente si el registro existe pero tiene valor 0
- [x] Busca el changeForNextDay o totalCash del día anterior


## Bug Reportado (v9)

### Actualización en cascada
- [x] Cuando se modifica el cambio para mañana de un día, actualizar el cambio anterior del día siguiente


## Bug Corregido (v10)

### Cambio para mañana ahora muestra Total Efectivo
- [x] El campo "Cambio para mañana" ahora muestra el Total Efectivo calculado automáticamente
- [x] Se sincroniza automáticamente con el Total Efectivo cuando no se modifica manualmente
- [x] El resumen "Cambio siguiente" también muestra el valor correcto


## Mejoras Implementadas (v12)

### Dashboard y Reportes
- [x] Añadir selector de período: semana, mes, trimestre, año
- [x] Datos se actualizan según el período seleccionado

### Cierre Trimestral
- [x] Permitir exportar CSV aunque el trimestre no haya terminado
- [x] Mensaje informativo de "datos parciales" en lugar de bloquear

### Facturas
- [x] Añadir checkbox "Escaneado/Contabilizado"
- [x] Marcar automáticamente si hay archivo adjunto
- [x] Campo isScanned en base de datos

### Gestión de Empleados
- [x] Crear sistema de login con usuario y contraseña
- [x] Administradores pueden crear empleados con credenciales (usuario + contraseña)
- [x] Administradores pueden cambiar contraseñas de empleados
- [x] Formulario de login con usuario/contraseña en lugar de OAuth

### Calendario de Turnos
- [x] Corregir bug de discrepancia vista semanal/mensual (ahora ambas usan datos del mes completo)
- [x] Plantilla de turnos habituales por empleado (en ficha de empleado)
- [x] Botón "Generar turnos del mes" que usa las plantillas configuradas


## Pendiente

### Calendario de Turnos
- [ ] Cambiar turnos arrastrando (drag & drop)

### Empleados
- [ ] Crear empleados iniciales: Ana y Juanlu

### Inventario
- [ ] Generación de lista de compra semanal
- [ ] Historial de pedidos

### Dashboard
- [ ] Gastos por proveedor
- [ ] Gráficos de tendencias
- [ ] Exportación a PDF/Excel

### Documentación
- [ ] Documentación de despliegue en VPS


## Mejoras Solicitadas (v13)

### Vista de Turnos
- [x] Mostrar hora inicio - hora fin en el calendario mensual (ej: "Maylin 10:00 - 14:00")

### Facturas
- [x] Cambiar texto del checkbox de "Contab." a "Escaneada"

### Dashboard y Cierres - Cálculo de Ingresos
- [x] Los ingresos deben calcularse de la Z de caja (no del efectivo en caja)
- [x] Mostrar efectivo retirado y tarjetas retiradas
- [x] Corregir que tarjetas aparece a 0 cuando no debería
- [x] Verificar que los totales coinciden con los datos reales de los cierres


## Sistema de Notificaciones con Email (v14)

### Base de datos
- [x] Crear tabla de notificaciones (userId, type, title, message, read, createdAt)
- [x] Crear tabla de configuración del sistema (SMTP settings)

### Backend - Notificaciones
- [x] Crear endpoints: list, markAsRead, markAllAsRead, getUnreadCount
- [x] Crear función para enviar notificaciones al asignar/modificar/eliminar turnos

### Backend - Email SMTP
- [x] Implementar servicio de envío de emails con nodemailer
- [x] Crear endpoints para guardar/obtener configuración SMTP
- [x] Enviar email al empleado cuando se le asigne/modifique un turno

### Frontend - Notificaciones
- [x] Añadir icono de campana con contador en el header
- [x] Crear panel desplegable de notificaciones
- [x] Marcar notificaciones como leídas al hacer click

### Frontend - Configuración
- [x] Crear página de Configuración en el menú de administración
- [x] Formulario para configurar servidor SMTP (host, puerto, usuario, contraseña, SSL)
- [x] Botón para probar la conexión SMTP

### Integración
- [x] Notificar y enviar email al crear un turno nuevo
- [x] Notificar y enviar email al modificar un turno existente
- [x] Notificar y enviar email al eliminar un turno


## Mejoras Solicitadas (v15)

### Gestión de Empleados
- [ ] Añadir botón para editar empleados existentes
- [ ] Añadir botón para eliminar empleados (desactivar)
- [ ] Permitir modificar nombre, email, rol y horarios habituales

### Corrección de Cálculos
- [ ] Revisar y corregir cálculo de efectivo retirado en Dashboard
- [ ] Revisar y corregir cálculo de tarjetas retiradas en Dashboard
- [ ] Verificar que los totales coinciden con los cierres de caja


### Envío de Email con Facturas
- [x] Enviar email automático al crear factura a thespotcentralhostel@gmail.com
- [x] Asunto: "Factura - [Proveedor] - [Fecha]"
- [x] Cuerpo: Datos de la factura (número, importe, categoría, notas)
- [x] Adjuntar archivo/foto de la factura

- [x] Permitir eliminar turnos del calendario haciendo clic en ellos


## Bug Corregido (v16)
- [x] Al eliminar un empleado, sus turnos se eliminan automáticamente en cascada


## Mejoras Responsive (v17)
- [ ] Mejorar responsive del Dashboard (tarjetas en columna en móvil)
- [ ] Mejorar responsive del calendario de Turnos (scroll horizontal, vista compacta)
- [ ] Mejorar responsive de Caja (formulario en columna)
- [ ] Mejorar responsive de Facturas (lista compacta en móvil)


## Bug Corregido (v17)
- [x] Añadido logging detallado al envío de email de facturas para diagnosticar problemas
- [x] Email de facturas funcionando correctamente con configuración SMTP
