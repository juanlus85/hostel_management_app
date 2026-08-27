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
- [x] Generación de lista de compra semanal
- [x] Historial de pedidos
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
- [x] Gastos por proveedor
- [x] Gráficos de tendencias
- [x] Exportación a PDF/Excel
- [x] Exportación XLSX del dashboard (resumen, proveedores y tendencias)

## Interfaz de Usuario
- [x] Diseño responsivo móvil/desktop
- [x] Navegación intuitiva con sidebar
- [x] Formularios rápidos para móvil
- [x] Tema moderno con colores de marca (azul/magenta)

## Pruebas y Documentación
- [x] Tests unitarios para funciones críticas
- [x] Documentación de despliegue en VPS


## Mejoras Solicitadas (v2)

### Caja
- [x] Caja automática sin apertura manual (se abre con saldo del día anterior)
- [x] Los días empiezan y terminan a las 6am
- [x] Corregir bug: botón "Abrir caja" no hace nada

### Calendario de Turnos
- [x] Vista mensual de todos los turnos
- [x] Calendario base/plantilla para crear turnos automáticamente
- [x] Cambiar turnos arrastrando (drag & drop)
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
- [x] Cambiar turnos arrastrando (drag & drop)

### Empleados
- [ ] Crear empleados iniciales: Ana y Juanlu

### Inventario
- [x] Generación de lista de compra semanal
- [x] Historial de pedidos

### Dashboard
- [x] Gastos por proveedor
- [x] Gráficos de tendencias
- [x] Exportación a PDF/Excel
- [x] Exportación XLSX del dashboard (resumen, proveedores y tendencias)

### Documentación
- [x] Documentación de despliegue en VPS


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
- [x] Añadir botón para editar empleados existentes
- [x] Añadir botón para eliminar empleados (desactivar)
- [x] Permitir modificar nombre, email, rol y horarios habituales

### Corrección de Cálculos
- [x] Revisar y corregir cálculo de efectivo retirado en Dashboard
- [x] Revisar y corregir cálculo de tarjetas retiradas en Dashboard
- [x] Verificar que los totales coinciden con los cierres de caja


### Envío de Email con Facturas
- [x] Enviar email automático al crear factura a thespotcentralhostel@gmail.com
- [x] Asunto: "Factura - [Proveedor] - [Fecha]"
- [x] Cuerpo: Datos de la factura (número, importe, categoría, notas)
- [x] Adjuntar archivo/foto de la factura

- [x] Permitir eliminar turnos del calendario haciendo clic en ellos


## Bug Corregido (v16)
- [x] Al eliminar un empleado, sus turnos se eliminan automáticamente en cascada


## Mejoras Responsive (v17)
- [x] Mejorar responsive del Dashboard (tarjetas en columna en móvil)
- [x] Mejorar responsive del calendario de Turnos (scroll horizontal, vista compacta)
- [x] Mejorar responsive de Caja (formulario en columna)
- [x] Mejorar responsive de Facturas (lista compacta en móvil)


## Bug Corregido (v17)
- [x] Añadido logging detallado al envío de email de facturas para diagnosticar problemas


## Scripts de Despliegue (v20)
- [x] Script prepare-deploy.sh para automatizar preparación de archivos
- [x] Checklist de despliegue completo
- [x] Instrucciones rápidas para Plesk
- [x] Archivo .env.example con todas las variables
- [x] Configuración PM2 para producción
- [x] Script probado y funcionando correctamente


## Bugs Reportados en Producción (v22)
- [x] Cerrar caja no funciona - el botón no hace nada (corregido: encadenar mutaciones)
- [x] Calendario mensual desplazado un día - los turnos aparecen un día después (corregido: usar fecha local en lugar de UTC)
- [x] No se pueden crear facturas - pide seleccionar un negocio (corregido: validación y mensaje de ayuda)
- [x] Crear incidencia dice que el título es obligatorio aunque tenga título (corregido: separar validaciones)
- [x] Inventario pide seleccionar un negocio (corregido: validación y mensaje de ayuda)

## Bugs Persistentes en Producción (v23)
- [x] currentBusinessId sigue siendo undefined - facturas/incidencias/inventario no funcionan (solucionado con seed-businesses.mjs)
- [x] Cerrar caja sigue sin funcionar en producción (solucionado con seed-businesses.mjs)

## Bugs Finales (v24)
- [x] Adjuntos en emails de facturas no se adjuntan al correo (corregido: descargar archivo antes de adjuntar)
- [x] Selector de color en empleados ha desaparecido (restaurado)
- [x] Verificar que los faltantes en inventario se pueden eliminar correctamente (ya existe botón de check verde)
- [x] Añadir funcionalidad de eliminar incidencias (botón + diálogo de confirmación)

## Bugs Persistentes (v25)
- [x] Color de empleados se guarda pero no persiste al recargar (corregido: campo ya existía en BD)
- [x] Color de empleados no se muestra en el calendario (corregido: actualizado getUserColor para usar colores personalizados)

## Bug Crítico Resuelto (v26)
- [x] Adjuntos en emails de facturas siguen sin adjuntarse al correo - SOLUCIONADO: implementado upload a S3 antes de crear factura
  - [x] Creado procedimiento invoices.uploadFile en backend para subir archivos a S3
  - [x] Modificado frontend para subir archivo a S3 antes de crear factura
  - [x] Factura ahora se crea con imageUrl válida
  - [x] Email se envía correctamente con adjunto descargado desde S3


## Bug Reportado en Producción (v27)
- [x] Adjuntos en emails siguen sin llegar en servidor de producción después de desplegar v26
- [x] Investigar si el problema es con la subida a S3 o con la descarga en el email
- [x] Revisar logs del servidor de producción
- [x] Verificar que las variables de entorno de S3 estén configuradas correctamente

**CAUSA RAÍZ IDENTIFICADA:**
Las variables de entorno BUILT_IN_FORGE_API_URL y BUILT_IN_FORGE_API_KEY no están disponibles en el servidor Plesk.
Estas variables son específicas del entorno de Manus y no se pueden usar en producción externa.

**SOLUCIÓN:**
- [x] Implementar almacenamiento local de archivos en el servidor
- [x] Guardar archivos en /httpdocs/uploads/invoices/
- [x] Servir archivos estáticamente desde esa carpeta
- [x] Adjuntar archivos directamente desde disco local al email
- [x] No depender de S3 ni servicios externos

**CAMBIOS IMPLEMENTADOS:**
- [x] Modificado server/routers.ts uploadFile para guardar archivos localmente
- [x] Modificado server/email.ts para leer archivos desde disco local
- [x] Modificado server/_core/vite.ts para servir /uploads como archivos estáticos
- [x] Probado en desarrollo: archivo guardado correctamente en uploads/invoices/


## Nuevas Funcionalidades (v28)
- [x] Agregar checkbox "Factura con IVA / A contabilizar" en formulario de facturas
  - [x] Agregar campo hasVAT (boolean) a la tabla invoices en schema
  - [x] Actualizar backend para guardar y recuperar el campo (create y update)
  - [x] Agregar checkbox en el formulario de crear factura (marcado por defecto)
  - [x] Agregar checkbox editable en la lista de facturas junto a "Escaneada"
- [x] Mejorar diseño responsive para móvil
  - [x] Optimizar lista de facturas para móvil (flex-col en mobile, flex-row en desktop)
  - [x] Ajustar formularios de crear/editar factura (grid-cols-1 en mobile, grid-cols-2 en desktop)
  - [x] Mejorar distribución de checkboxes y botones en móvil


## Mejoras v29 (Completadas)
- [x] Bloquear campo Prepago Booking en caja de Tienda
- [x] Agregar rol housekeeping al enum de roles
- [x] Crear housekeepingProcedure en backend
- [x] Configurar menú de navegación para housekeeping
- [x] Crear tabla room_status para gestión de habitaciones
- [x] Crear página Housekeeping.tsx
- [x] Agregar ruta /housekeeping
- [x] Corregir bug último día del mes en calendario
- [x] Corregir bug fecha incorrecta al añadir turno
- [x] Agregar campos createdBy/updatedBy a tablas

**Nota:** Visualización de metadatos en frontend pendiente para v30


## Bugs Reportados v30
- [x] Calendario: turnos del último día del mes se crean pero no se muestran (corregido monthRange con formato local)
- [x] Rol housekeeping no aparece en el formulario de crear/editar empleados (agregado a formularios y backend)
- [x] Menú housekeeping ahora visible para TODOS los usuarios (admin, user, housekeeping) según requerimiento


## Bugs y Mejoras v31
- [x] Error al crear facturas: falta campo updatedBy en INSERT (agregado updatedBy = userId)
- [x] Menú housekeeping muestra todo igual que empleado (corregido: ahora solo ve horarios, tareas, incidencias, inventario, housekeeping)
- [x] Duplicado: aparece "Horarios" y "Turnos" en el menú (unificado: ahora solo "Turnos" en ambos menús)
- [x] Agregar estado "Habitación Lista" en verde oscuro a la gestión de habitaciones (agregado con bg-green-700)


## Bugs Corregidos v32
- [x] Error al crear facturas: updatedBy ya estaba en el código, solo necesita recompilación
- [x] Duplicado Turnos/Horarios: corregida lógica de currentMenuItems (housekeeping ve solo su menú, admin ve menú+admin, user ve solo menú)
- [x] Rol housekeeping: agregado texto "Housekeeping" en lugar de "Empleado"


## Bugs Reportados (v33)

### Menú Duplicado
- [x] Empleados, Proveedores, Cierre Trimestral y Configuración aparecen duplicados en el menú
- [x] Deben aparecer solo una vez en la sección de ADMINISTRACIÓN
- [x] SOLUCIÓN: Eliminado adminMenuItems de currentMenuItems en DashboardLayout.tsx

### Dashboard
- [x] No muestra ingresos ni gastos (muestra 0)
- [x] En Cierre Trimestral sí aparecen los datos correctamente
- [x] SOLUCIÓN: Crear tabla cash_closings en producción (script SQL_CASH_CLOSINGS.sql)

### Facturas
- [x] Error al crear facturas (persiste después de ejecutar SQL)
- [x] Necesita diagnóstico del error exacto
- [x] SOLUCIÓN: Agregar columnas faltantes a tabla invoices (script SQL_COMPLETO_INVOICES.sql)


## Mejoras Solicitadas (v34)

### Housekeeping
- [x] Agregar "Housekeeping" al menú principal para administradores y empleados
- [x] Actualmente solo aparece para rol housekeeping
- [x] Agregar botón "Marcar como Lista" en vista Housekeeping para cambiar estado a "ready"
- [x] SOLUCIÓN: Agregado item Housekeeping con icono Sparkles al menuItems en DashboardLayout
- [x] SOLUCIÓN: Agregado botón verde "Marcar como Lista" que aparece cuando estado != "ready"
- [x] SOLUCIÓN: Agregada opción "Habitación Lista" al selector de estado


## Sistema de Notificaciones (v35)

### Notificaciones de Checkout
- [x] Crear procedimiento tRPC para enviar notificaciones cuando se registra checkout
- [x] Integrar notificaciones en el flujo de actualización de estado en Housekeeping
- [x] Notificar a todos los usuarios con rol "housekeeping"
- [x] Incluir número de habitación y fecha en la notificación


## Mejora de Menú (v35)

- [x] Eliminar separador "ADMINISTRACIÓN" del menú lateral
- [x] Mostrar todos los menús en lista continua sin separación
- [x] Los menús de admin (Empleados, Proveedores, Cierre Trimestral, Configuración) deben aparecer después de Housekeeping
- [x] SOLUCIÓN: Fusionado adminMenuItems con menuItems en currentMenuItems para admins
- [x] SOLUCIÓN: Eliminado bloque completo de sección ADMINISTRACIÓN con separador


## Bugs Reportados v35 (Rollback)

- [x] Cierre Trimestral muestra Total Gastos €0.00 - No filtra facturas correctamente por rango de fechas (corregido: pasar startDate/endDate al backend)

- [x] Cierre Trimestral opción "Ambos" no suma ingresos/gastos de Hostel + Tienda (corregido: queries separadas para cada negocio y combinación de resultados)


## v41 - Módulo Otros Gastos (Implementación desde cero)

- [x] 1. Crear tabla otros_gastos en drizzle/schema.ts
- [x] 2. Ejecutar migración SQL para crear tabla en base de datos
- [x] 3. Crear funciones en server/db.ts (createOtroGasto, listOtrosGastos, updateOtroGasto, deleteOtroGasto)
- [x] 4. Crear procedimientos tRPC en server/routers.ts (otrosGastos.create, list, update, delete)
- [x] 5. Crear página client/src/pages/OtrosGastos.tsx
- [x] 6. Agregar ruta /otros-gastos en App.tsx
- [x] 7. Agregar menú "Otros Gastos" en DashboardLayout (solo admin)
- [x] 8. Integrar en Dashboard: sumar otros_gastos a total gastos
- [x] 9. Integrar en Cierre Trimestral: incluir otros_gastos en exportación CSV
- [x] 10. Probar creación de gastos en desarrollo
- [ ] 11. Compilar y desplegar v41 por FTP
- [ ] 12. Verificar funcionamiento en producción

## Ajuste de menú
- [x] Mover "Otros Gastos" justo debajo de "Facturas" en el menú

## Selector "Ambos" - Mostrar datos combinados
- [x] Modificar Facturas para mostrar datos de ambos negocios cuando se selecciona "Ambos"
- [x] Modificar Otros Gastos para mostrar datos de ambos negocios cuando se selecciona "Ambos"
- [x] Modificar Incidencias para mostrar datos de ambos negocios cuando se selecciona "Ambos"
- [x] Modificar Tareas para mostrar datos de ambos negocios cuando se selecciona "Ambos"
- [x] Modificar Inventario para mostrar datos de ambos negocios cuando se selecciona "Ambos"
- [x] Verificar que todas las páginas muestren correctamente datos combinados

## Método de pago en Otros Gastos
- [x] Agregar campo paymentMethod a tabla otros_gastos en schema
- [ ] Ejecutar migración SQL en producción (pendiente usuario)
- [x] Agregar campo paymentMethod al formulario de Otros Gastos
- [x] Mostrar método de pago en la lista de gastos

## Correcciones finales
- [x] Cierre Trimestral: incluir último día del trimestre en el rango de fechas
- [x] Otros Gastos: eliminar selector hostel/tienda redundante
- [x] Incidencias: implementar selector "Ambos" para mostrar datos combinados
- [x] Inventario: implementar selector "Ambos" para mostrar datos combinados

## Bug Caja
- [x] Corregir bug: valores de caja se resetean a 0 al cambiar de pestaña del navegador

## Mejoras adicionales v42
- [x] 1. Renombrar archivos de facturas: [Proveedor] - [Trimestre]T - [Fecha].pdf
- [x] 2. Verificar que cierre trimestral incluye último día del trimestre (ya corregido)
- [x] 3. Dashboard: agregar selector de fechas personalizado (rango custom)
- [x] 4. Otros Gastos/Ingresos: agregar tipo (gasto/ingreso) y actualizar dashboard/cierre (falta SQL producción)
- [x] 5. Crear nuevo menú "Resumen Semanal" con:
  - [x] 5.1. Dinero retirado efectivo/tarjeta por día de la semana
  - [x] 5.2. Ingresos y gastos por negocio
  - [x] 5.3. Balance semanal
  - [x] 5.4. Resumen de incidencias pendientes
  - [x] 5.5. Productos con stock bajo
  - [x] 5.6. Tareas pendientes

## Correcciones v43
- [x] Bug: Ingresos en Otros Gastos/Ingresos - corregido procedimiento update
- [x] Resumen Semanal: agregar desglose diario de efectivo retirado (backend listo, falta frontend)

## Nuevas funcionalidades v43
- [x] Facturas: agregar opción de eliminar factura
- [x] Facturas: permitir subir documento después de crear factura (y reenviar email)


## Correcciones v44
- [x] Dashboard y cierre trimestral: ingresos de otros_gastos se suman incorrectamente a gastos
- [x] Menú Housekeeping no funciona para empleados (solo funciona para admin)
- [x] Resumen Semanal: agregar desglose diario de efectivo/tarjeta retirado (Lunes, Martes, etc.)

## Correcciones v45
- [x] Dashboard suma cierres con status='draft' cuando solo debería sumar status='closed' (diferencia €662.45)

## Correcciones v46
- [x] Retiros Diarios en Resumen Semanal no suma Hostel + Tienda (solo muestra un negocio)

## Correcciones v47
- [x] getDailyWithdrawals no filtra por status='closed' - muestra datos incorrectos

## Correcciones v48
- [x] Retiros Diarios desfasados 1 día: muestra Domingo como Lunes, Lunes como Martes

## Mejoras v49
- [x] Separar Ingresos (Z) de Otros Ingresos en Dashboard y Cierre Trimestral
- [x] Mostrar desglose de efectivo/tarjeta en Ingresos (Z) en texto pequeño

## Correcciones v50
- [x] Cambiar descripción "Devoluciones, etc." a "Otros ingresos" en Dashboard y Cierre Trimestral

## Nueva Feature v51 - Cajas F
- [x] Crear tabla safe_boxes en schema (fecha, tipología, concepto, cantidad, acumulado, chequeo, businessId)
- [x] Crear procedimientos tRPC para listar, crear, actualizar y eliminar movimientos
- [x] Crear página CajasF.tsx con tabs (C.F. Hostel, C.F. Tienda)
- [x] Implementar formulario para agregar movimientos
- [x] Mostrar tabla con últimas 30 entradas
- [x] Agregar menú "Cajas F" solo visible para admin


## Nueva Feature v51 - Cajas F
- [x] Crear tabla safe_boxes en schema
- [x] Crear procedimientos tRPC para CRUD de movimientos
- [x] Crear página CajasF.tsx con tabs Hostel/Tienda
- [x] Agregar menú Cajas F (solo admin)

## Nueva Feature v52 - Códigos de Acceso
- [x] Crear tabla access_codes en schema
- [x] Crear procedimientos tRPC para CRUD de códigos
- [x] Crear página CodigosAcceso.tsx con tabla de habitaciones
- [x] Agregar menú Códigos de Acceso (visible para todos, editable solo admin)


## Nueva Feature v51 - Cajas F
- [x] Crear tabla safe_boxes en schema
- [x] Crear procedimientos tRPC para CRUD de movimientos
- [x] Crear página CajasF.tsx con tabs Hostel/Tienda
- [x] Agregar menú Cajas F (solo admin)

## Nueva Feature v52 - Códigos de Acceso
- [x] Crear tabla access_codes en schema
- [x] Crear procedimientos tRPC para CRUD de códigos
- [x] Crear página CodigosAcceso.tsx con tabla de habitaciones
- [x] Agregar menú Códigos de Acceso (visible para todos, editable solo admin)

## Mejora v55 - Resumen Semanal
- [x] Crear tabla weekly_cash_envelopes (efectivo esperado vs real por día)
- [x] Crear tabla weekly_availability_sources (fuentes de disponibilidad: cuentas, cajas)
- [x] Crear tabla weekly_availability_records (registros de disponibilidad por semana)
- [x] Actualizar página ResumenSemanal.tsx con control de efectivo en sobres
- [x] Agregar sección de disponibilidad en cuentas/cajas (cada lunes)
- [x] Implementar navegación entre semanas
- [x] Agregar gráfico histórico de disponibilidad total (pendiente)

## Bug v55
- [x] Rol housekeeping no puede ver menú Códigos de Acceso (debería poder verlo en modo lectura)

## Bug v55 - React Hooks
- [x] Error "Rendered fewer hooks than expected" en ResumenSemanal.tsx (useState dentro de .map())

## Mejora v56 - Resumen Semanal
- [x] Título "Disponibilidad Semanal" debe mostrar fecha del lunes siguiente (ej: "Disponibilidad Semanal a Lunes 22")
- [x] Columna "Debería Haber" en Efectivo en Sobres debe auto-calcularse desde retiros diarios (no editable)
- [x] Gráfico histórico con Chart.js (cada año una línea, empieza con puntos)

## Mejora v57 - Configuración OpenAI API
- [x] Crear tabla app_settings para almacenar configuración global
- [x] Agregar procedimientos tRPC para guardar/obtener OpenAI API key
- [x] Agregar sección en página Configuración para ingresar OpenAI API key
- [x] Actualizar sistema OCR para usar la clave configurada en lugar de variable de entorno

## Bug v58 - Horarios
- [x] Cuando la semana cruza entre meses (ej: 29 dic - 4 ene), solo muestra hasta el último día del mes actual (31 dic). Debe mostrar todos los días de la semana incluyendo los del mes siguiente (1-4 ene).

## Bug v59 - Turnos vista semanal
- [x] Los turnos aparecen desplazados un día hacia adelante en vista semanal (turno del 24 se muestra el 25, del 25 en el 26, etc.). Vista mensual funciona correctamente.

## Bug v60 - Turnos vista semanal
- [x] No se muestra el último día de cada semana (domingo) en la vista semanal de Turnos.


## Mejoras v66 (Completadas)
- [x] Facturas: Mostrar solo 30 últimas por defecto
- [x] Facturas: Agregar selector de mes/año para filtrar
- [x] Cierre Trimestral: Agregar listado de gastos ordenados (facturas + otros gastos)
- [x] Cierre Trimestral: Crear sistema de pestañas (Resumen, Gastos Detallados, Gráficos)
- [x] Recuperar correcciones de v65 (pestañas Resumen Semanal + responsive)
- [x] Agregar número de versión en menú de usuario


## Mejoras v67 (Completadas)
- [x] Cierre Trimestral - Gastos Detallados: Agrupar por proveedor/concepto con totales acumulados
- [x] Mostrar suma total de cada proveedor/concepto en el trimestre
- [x] Ordenar de mayor a menor por monto total
- [x] Mostrar número de registros y negocios asociados


## Mejoras v68 (Completadas)
- [x] Cierre Trimestral - Gastos Detallados: Agregar total de gastos arriba (Total Declarable)
- [x] Cierre Trimestral - Gastos Detallados: Checkboxes para incluir/excluir gastos del total
- [x] Facturas: Cambiar selector de mes a mes+año (muestra "Enero 2025", "Febrero 2025", etc.)

## Bug Reportado v70
- [x] Dashboard y Cierre Trimestral muestran gastos diferentes para el mismo trimestre
  - Dashboard (4to Trimestre): €74,350.51
  - Cierre Trimestral (4to Trimestre): €77,352.41
  - Diferencia: €3,001.90
  - CAUSA: Facturas creadas en modo "Ambos" se guardaban duplicadas (una para Hostel, otra para Tienda)
  - SOLUCIÓN: Obligar a seleccionar negocio específico en formularios cuando está en modo "Ambos"

## Mejoras v70
- [x] Agregar selector obligatorio de negocio en formulario de Facturas cuando selectedBusiness = "all"
- [x] Agregar selector obligatorio de negocio en formulario de Gastos/Ingresos cuando selectedBusiness = "all"
- [x] Agregar selector obligatorio de negocio en formulario de Incidencias cuando selectedBusiness = "all"
- [x] Agregar selector obligatorio de negocio en formulario de Inventario cuando selectedBusiness = "all"

## Bug Corregido v71
- [x] Dashboard y Cierre Trimestral mostraban gastos diferentes (€74,350.51 vs €77,352.41)
- [x] CAUSA: Cálculo incorrecto de fecha fin de trimestre en Dashboard
  - `new Date(2025, 3*3+3, 0)` daba 30 noviembre en lugar de 31 diciembre
  - Dashboard solo contaba hasta 30 nov, perdiendo todo diciembre (€3,001.90)
- [x] SOLUCIÓN: Cambiar `currentQuarter * 3 + 3` por `(currentQuarter + 1) * 3`

## Bug Corregido v72
- [x] Selector de año en Facturas solo mostraba años pasados (2025, 2024, 2023...)
- [x] No incluía año siguiente (2026), impidiendo preparar facturas del próximo año
- [x] SOLUCIÓN: Cambiar lógica para mostrar: año siguiente + año actual + 3 años anteriores

## Fixes Completos v73
- [x] Selector de meses rediseñado: ahora con 3 selectores separados (Período, Año, Mes)
- [x] Fix de cálculo de trimestre en Dashboard (v71) incluido
- [x] Selector de año acumulativo (v72) incluido
- [x] Nuevo flujo: Período → Año → Mes (más intuitivo)

## Bug Crítico Resuelto v74
- [x] Dashboard perdía un día al calcular rangos de fechas por problema de timezone
  - `new Date(2025, 12, 0).toISOString()` daba "2025-12-30" en lugar de "2025-12-31"
  - Causa: toISOString() convierte a UTC, restando horas y cambiando el día
  - Solución: Crear función formatDateLocal() que formatea YYYY-MM-DD sin conversión UTC
  - Ahora Dashboard y Cierre Trimestral muestran exactamente los mismos totales

## Feature v75
- [x] Agregar icono de archivo clickeable en lista de facturas
  - Mostrar icono al lado del nombre del proveedor si la factura tiene archivo subido
  - Al hacer clic, abrir archivo en nueva pestaña

## Feature v76
- [x] Agregar opción de reemplazar archivo en diálogo de edición de factura
  - Mostrar botón "Reemplazar archivo" cuando la factura ya tiene archivo subido
  - Permitir seleccionar nuevo archivo que reemplazará el anterior
  - Incluye link para ver archivo actual antes de reemplazarlo

## Mejora v77
- [x] Agregar numeración automática a archivos duplicados de facturas
  - Mantener formato actual: Proveedor - 4T 2025 - 251231.pdf
  - Si existe duplicado: Proveedor - 4T 2025 - 251231 (2).pdf
  - Numeración automática: (3), (4), etc.
  - Aplicado tanto en subida inicial como en reemplazo de archivo
  - El nombre del archivo se mantiene igual en servidor y en adjunto de correo

## Bug v78
- [x] Formato de fecha en nombre de archivo incorrecto
  - Actual: AAMMDD (251231)
  - Correcto: DDMMAA (311225)
  - Corregir en subida inicial y reemplazo de archivo

## v78: Corrección de formato de fecha en nombres de archivo
- [x] Cambiar formato de fecha de AAMMDD a DDMMAA en nombres de archivo de facturas
  - Antes: "Coca Cola - 4T 2025 - 251231.pdf" (año-mes-día)
  - Ahora: "Coca Cola - 4T 2025 - 311225.pdf" (día-mes-año)
- [x] Corregido en 3 ubicaciones del código:
  - Subida inicial de archivo (línea 273-283)
  - Ver archivo desde lista (línea 776-778)
  - Reemplazo de archivo en edición (línea 925-927)
- [x] Verificado funcionando correctamente: archivo guardado como "Coca Cola - 4T 2025 - 311225.pdf"


## v79: Módulo Histórico de Cajas - Mejoras de gráficos
- [x] Agregar gráfico combinado (Hostel + Tienda + Total) por años
- [x] Agregar selector para ver gráficos por meses específicos
- [x] Permitir comparar un mes a lo largo de los años
- [x] Agregar selector de datos (Hostel, Tienda, Total, Hostel+Tienda, Todos)


## v80: Sistema global de años dinámicos + Pestaña Acumulados
- [x] Crear sistema global de detección automática de años desde la base de datos
- [x] Agregar pestaña "Acumulados" con gráfico de evolución acumulada mes a mes
- [x] Aplicar detección de años a Histórico de Cajas
- [x] Aplicar detección de años a Facturas
- [x] Aplicar detección de años a Otros Gastos (no tiene selector de año)
- [x] Aplicar detección de años a Resumen Semanal (no tiene selector de año)
- [x] Aplicar detección de años a Cierre Trimestral


## v81: Mejoras Histórico de Cajas - Acumulados y Variación Anual
- [x] Agregar selector de datos (Hostel/Tienda/Total/Todos) en vista Acumulados
- [x] Agregar vista de comparación multi-año superpuesta en Acumulados
- [x] Agregar columna "Variación Anual %" en tablas de Vista Gráficas
- [x] Corregir acumulados del año en curso y permitir seleccionar o deseleccionar años fácilmente.


## v82: Exportación XLSX en Cierre Trimestral
- [x] Agregar botón de exportación a XLSX en Cierre Trimestral
- [x] Generar estructura con título, secciones por negocio (HOSTEL, SWEET & SALTY), meses y totales
- [x] Formato similar a la imagen de referencia del usuario


## v82.1: Correcciones exportación XLSX Cierre Trimestral
- [x] Cambiar texto del botón a "Exportar Ingresos Trimestre en XLSX"
- [x] Corregir cálculo de datos (Q4 2025 muestra 0 cuando debería tener valores)
- [x] Agregar valores individuales en celdas de meses (no solo "Total")
- [x] Agregar fórmula SUM en "Total Trimestre" que sume las 3 celdas de los meses
- [x] Mostrar solo los meses correspondientes al trimestre seleccionado
- [x] Incluir el año en el título del XLSX


## v82.2: Corrección businessId en exportación XLSX
- [x] Corregir handleExportXLSX para usar zReading en lugar de totalZ inexistente
- [x] Los cierres de caja ya vienen filtrados por businessId en hostelClosings y tiendaClosings
- [x] Verificar que Q4 2025 muestra valores correctos en el XLSX exportado


## v82.3: Bug exportación XLSX - Datos Hostel no aparecen
- [x] Investigar por qué los datos del Hostel no se exportan correctamente en XLSX
- [x] Problema: enabled de hostelClosings solo se ejecutaba si selectedBusiness era "all" o "hostel"
- [x] Solución: Siempre obtener datos de ambos negocios para XLSX, independiente del filtro de interfaz
- [x] Ahora hostelClosings y tiendaClosings siempre tienen datos disponibles para exportar

## v82.4: Bug Dashboard suma datos de diciembre en lugar de enero
- [x] Dashboard muestra ingresos del 31 de diciembre cuando debería mostrar €0.00 (no hay cierres de enero todavía)
- [x] Revisar función getDashboardStats - filtrado de fechas incorrecto
- [x] Debe mostrar solo datos del período seleccionado (enero), no del mes anterior

## v82.3: Bugs Reportados en Producción
- [x] Dashboard muestra ingresos del 31 de diciembre cuando debería mostrar €0.00 (no hay cierres de enero todavía)
- [x] Menú "Histórico de Cajas" desaparece después de desplegar - CAUSA: Caché del navegador
- [x] Solución: Limpiar caché del navegador con Ctrl+Shift+R después de desplegar
- [x] Agregado logging a getDashboardStats para debug
- [x] Creadas instrucciones detalladas de despliegue (INSTRUCCIONES_DESPLIEGUE_V82.3.md)

## v82.4: Corregir formato XLSX
- [x] Exportación XLSX usa separador de miles con punto (.) - debe eliminarse
- [x] Solo usar punto (.) para separar decimales
- [x] Formato moneda: 1234.56 € (no 1.234.56 €)

## v82.5: Bug timezone en Facturas
- [x] Facturas del 31 de diciembre aparecen en enero (bug de timezone)
- [x] Al filtrar por diciembre 2025, no muestra facturas del 31/12
- [x] Al filtrar por enero 2026, muestra facturas del 31/12/2025 (incorrecto)
- [x] Aplicar mismo fix de formatDateLocal que usamos en Dashboard

## v82.6: Filtros de fecha en Otros Gastos/Ingresos
- [x] Agregar filtros de fecha como en Facturas
- [x] Por defecto: mostrar últimos 30 días
- [x] Opción: mostrar todos
- [x] Opción: filtrar por mes específico (selector año + mes)
- [x] Usar formatDateLocal para evitar bugs de timezone

## v82.6: Agregar prepago Booking en Dashboard
- [x] Mostrar campo "Retirado Prepago Booking" en Dashboard
- [x] Solo en vista Hostel y solo visible para rol admin (no Tienda ni Ambos)
- [x] Mostrar total del mes en curso (no semana)
- [x] Obtener datos de tabla cashClosings campo prepaidBooking donde paymentMethod = 'prepago_booking'

## v82.6: Reordenar pestañas en Histórico de Cajas
- [x] Cambiar orden de pestañas: Gráficos (por defecto), Acumulados, Vista Anual

## v82.7: Cierre Trimestral muestra 4T por defecto
- [x] Cambiar lógica para mostrar trimestre actual (1T en enero, 2T en abril, etc.)
- [x] Calcular trimestre actual basado en mes actual: Math.floor(mes / 3)

## v82.8: Mover Prepago Booking dentro de Ingresos (Z)
- [x] Eliminar card separada de Prepago Booking
- [x] Agregar prepago booking en texto pequeño dentro de card Ingresos (Z)
- [x] Formato: "Efectivo: €X | Tarjetas: €X | Prepago Booking: €X"
- [x] Solo visible en vista Hostel (no Tienda ni Ambos)

## v82.9: Mostrar Prepago Booking en todas las vistas
- [x] Quitar restricción period === "month"
- [x] Mostrar en semana, mes, trimestre, año, personalizado
- [x] Mantener restricción solo Hostel (no Tienda ni Ambos)

## v82.10: Incluir año actual en Histórico de Cajas
- [x] Modificar lógica de años disponibles para incluir siempre el año actual
- [x] Aunque no haya datos de 2026, debe aparecer en el selector
- [x] Cuando llegue 2027, debe aparecer automáticamente

## v82.13: Bug tabla mensual Hostel 2026
- [x] Tabla mensual Hostel muestra €0.00 en todos los meses de 2026
- [x] Tabla mensual Tienda SÍ muestra datos correctos de 2026
- [x] Gráfico anual muestra barra de 2026 correctamente
- [x] Investigar por qué hostelByMonth no incluye datos de 2026
- [x] Asegurar que funcione para 2027 y años futuros

## v82.14: Bug gráfico Tienda 2026
- [x] Gráfico anual de Tienda no muestra barra de 2026
- [x] Tabla mensual de Tienda SÍ muestra datos correctos de 2026
- [x] Gráfico anual de Hostel SÍ muestra barra de 2026
- [x] Investigar por qué tiendaByYear no incluye 2026

## Sistema de Gestión de Pedidos (v83)
### Inventario
- [x] Tabla de productos con campos: nombre, categoría, en_inventario, precio, coste
- [x] Vista tipo Excel con todos los productos
- [x] Importación CSV (vacía BD y actualiza con nuevo CSV)
- [x] Añadir artículo manualmente
- [x] Modificar artículo existente

### Pedidos Generales
- [x] Crear pedido con proveedor, fecha estimada
- [x] Marcar pedido como "pedido realizado"
- [x] Marcar pedido como "pedido recibido"
- [x] Añadir artículos al pedido con unidades/packs
- [x] Selector desplegable de artículos con autocompletado
- [x] Funcionalidad de copia al portapapeles

### Pedidos Bocatas del Chef
- [x] Lista predefinida de artículos (Burguer, Mojo, Serranito, etc.)
- [x] Campo "Pedir" para número de cajas
- [x] Campo "Hay" para unidades actuales (editable)
- [x] Campo "Total" calculado automáticamente (no editable)
- [x] Baguettes/Tostas: 6 unidades por caja
- [x] Baguepizzas: 16 unidades por caja
- [x] Total de cajas con formato especial (25 = "21+4", 50 = "42+8")
- [x] Funcionalidad de copia al portapapeles (solo artículos > 0)

### General
- [x] Solo visible para administradores
- [x] Menú "Pedidos" en la navegación


## Mejoras Sistema de Pedidos v84

### Estructura General
- [x] Unificar los 3 módulos en un solo menú "Pedidos" con pestañas
- [x] Crear componente PedidosUnificado.tsx con Tabs (Inventario | Pedidos Generales | Bocatas)
- [x] Actualizar menú lateral para mostrar solo "Pedidos" en lugar de 3 items separados

### Inventario Productos
- [x] Ocultar columnas Handle y REF de la tabla
- [x] Ordenar productos por Categoría (alfabéticamente)
- [x] Corregir importación CSV: detectar separadores (coma/punto y coma)
- [x] Corregir parsing de números decimales (punto vs coma decimal)
- [x] Validar que Coste, Precio y Stock se importen correctamente

### Pedidos Generales
- [x] Añadir desplegable de productos del Inventario al añadir item
- [x] Añadir desplegable de unidades (unidades, packs, cajas, kg, litros)
- [x] Cambiar inputs de cantidad a solo números enteros (no decimales)
- [x] Modificar función copiar para NO incluir fecha estimada

### Pedidos Bocatas
- [x] Rediseñar con vista tipo Excel (tabla compacta)
- [x] Columnas: Producto | Hay (stock actual) | Pedir (input editable) | Total
- [x] Mostrar todos los productos en una sola tabla
- [x] Calcular Total automáticamente: Hay + Pedir
- [x] Eliminar formulario de cajas/unidades (solo input simple de cantidad a pedir)
- [x] Mantener botón Copiar y Guardar


## Mejoras Sistema de Pedidos v85

### Pedidos Bocatas del Chef
- [x] Rediseñar con formato agrupado por tipo (Baguettes, Tostas, Bocapizzas)
- [x] Columnas: Artículo | Pedir (Cajas) | Hay (Unidades) | Total (Unidades)
- [x] Mostrar unidades por caja en cada grupo (ej: "6 unidades por caja")
- [x] Calcular Total = (Cajas × Unidades/Caja) + Hay
- [x] Total general con formato especial: cuando llegue a 25 mostrar "21+4" en lugar de "25"
- [x] Agrupar productos: Baguettes (6 uds/caja), Tostas (6 uds/caja), Bocapizzas (16 uds/caja)

### Inventario Productos
- [x] Corregir bug: CSV no carga Coste, Precio y Stock correctamente
- [x] Verificar que los valores numéricos se parsean correctamente
- [x] Asegurar que los campos se guardan en la base de datos

### Pedidos Generales
- [x] Añadir tercer estado: "Pendiente de pedir" (antes de "Ordenado")
- [x] Estados: Pendiente → Ordenado → Recibido
- [x] Desplegable de proveedores existentes (de la tabla suppliers)
- [x] Permitir editar pedidos ya creados (nombre proveedor, fecha, notas)
- [x] Botón "Editar" en cada pedido


## Mejoras Sistema de Pedidos v86

### Pedidos Bocatas del Chef
- [x] Reorganizar productos en 3 grupos:
  * Grupo 1: 13 Bocatas (6 uds/caja): Burguer, Lomo al Mojo, Serranito, Lomo W, Frankfurt, Tortilla, Empanado, BBQ, Pollo Bacon, Carbonara, York, Serrano, Piripi
  * Grupo 2: Tostas (6 uds/caja): Tosta Barbacoa, Tosta Carbonara, Tosta Pollo Bacon, Tosta Rulo Cabra, Tosta 3 Quesos, Tosta York
  * Grupo 3: Bocapizzas (16 uds/caja): Bocapizza York, Bocapizza Bacon, Bocapizza BBQ, Bocapizza 4Q, Bocapizza Atun
- [x] Modificar función copiar: solo copiar número de cajas y nombre del producto (no stock ni total)
- [x] Formato total: mostrar "25 (21+4)" en lugar de solo "25" cuando corresponda

### Pedidos Generales
- [x] Permitir modificar artículos ya añadidos a un pedido (cantidad, unidad)
- [x] Permitir cambiar el estado del pedido directamente (desplegable o botones)
- [x] Botón "Editar" en cada artículo de la lista


## Mejoras Sistema de Pedidos v87

### Pedidos Bocatas del Chef
- [x] Implementar persistencia en localStorage para guardar el último pedido
- [x] Cargar automáticamente los datos del último pedido al entrar
- [x] Corregir formato total: debe mostrar "21+4" después de 25 (ej: 29 → "29 (25+4)")

### Pedidos Generales
- [x] Permitir añadir nuevos artículos a pedidos ya creados
- [x] Botón "Añadir artículo" en cada pedido existente
- [x] Permitir volver a estado "Pendiente de pedir" desde cualquier estado


## Sistema de Check-in de Huéspedes v88 (MVP Completado)

### Base de Datos
- [x] Crear tabla guests con todos los campos necesarios
- [x] Crear tabla hostel_settings_checkin para configuración
- [x] Reutilizar tabla room_codes existente
- [x] Crear índices para búsquedas rápidas

### Backend (tRPC)
- [x] Endpoints CRUD para guests
- [x] Endpoint para check-in presencial
- [x] Endpoint para check-in online (público) - Próxima fase
- [x] Endpoint para generar link personalizado - Próxima fase
- [x] Endpoint para exportación XML policía
- [x] Endpoint para generación de PDF - Próxima fase
- [x] Endpoints para configuración del sistema
- [x] Endpoint para envío de emails - Próxima fase

### Frontend - Componente Principal
- [x] Crear CheckinUnificado.tsx con pestañas
- [x] Pestañas: Check-in | Huéspedes | Anticipado | Online | Códigos | Exportar | Config

### Pestaña Check-in Presencial
- [x] Formulario de huéspedes (múltiples)
- [x] Datos de reserva (fechas, habitación, códigos)
- [x] Información de pago
- [x] Firma digital con canvas
- [x] Aceptación de términos y condiciones
- [x] Validación completa de campos

### Pestaña Huéspedes
- [x] Búsqueda por nombre, documento, reserva, fechas
- [x] Tarjetas de huéspedes con estados
- [x] Ver detalles completos - Próxima fase
- [x] Editar huésped existente - Próxima fase
- [x] Descargar PDF individual - Próxima fase
- [x] Eliminar huésped

### Pestaña Check-in Anticipado
- [x] Formulario para generar link personalizado (SIN códigos)
- [x] Campos: reserva, nombre, email, habitación, fecha llegada
- [x] Selección de idioma (ES/EN)
- [x] Generar link único con token
- [x] Copiar link al portapapeles
- [x] Enviar por email
- [x] Huésped rellena formulario pero NO recibe códigos

### Pestaña Check-in Online
- [x] Formulario para generar link personalizado (CON códigos)
- [x] Campos: reserva, nombre, email, habitación, códigos de acceso
- [x] Selección de idioma (ES/EN)
- [x] Generar link único con token
- [x] Copiar link al portapapeles
- [x] Enviar por email
- [x] Huésped rellena formulario y recibe códigos automáticamente

### Pestaña Códigos de Acceso
- [x] Reutilizar componente existente de room_codes
- [x] Integración con asignación automática

### Pestaña Exportar Policía
- [x] Selector de rango de fechas
- [x] Lista de huéspedes a exportar
- [x] Validación de datos obligatorios
- [x] Generación de XML según Real Decreto 933/2021
- [x] Descarga del archivo XML

### Pestaña Configuración
- [x] Datos del hostel (nombre, dirección, RTA)
- [x] Código establecimiento policía
- [x] Términos y condiciones (ES/EN)
- [x] Política de privacidad (ES/EN) - Próxima fase
- [x] Mensajes de bienvenida (ES/EN) - Próxima fase
- [x] Configuración SMTP
- [x] Tipos de habitación - Próxima fase

### Ruta Pública
- [x] Crear ruta /public/checkin/:token
- [x] Formulario público sin autenticación
- [x] Cargar datos pre-rellenados desde token
- [x] Permitir completar check-in
- [x] Mostrar información de acceso al finalizar
- [x] Enviar email de confirmación

### Componentes Auxiliares
- [ ] SignaturePad para firma digital
- [ ] GuestFormFields para formulario de huésped
- [ ] GuestCard para tarjetas de huéspedes
- [ ] EditGuestModal para edición

### Funcionalidades Adicionales
- [x] Generación de PDF con todos los datos y firma
- [x] Sistema de notificaciones para check-ins online
- [x] Dashboard de estadísticas de check-ins
- [x] Integración con sistema de reservas existente


## Mejoras Check-in Presencial v89

### Formulario Completo
- [x] Añadir todos los campos obligatorios para policía
- [x] Desplegable de nacionalidades (países)
- [x] Desplegable de género (Masculino/Femenino/Otro)
- [x] Desplegable de tipo documento (Passport/DNI/NIE/Driving License)
- [x] Campos de dirección completa (calle, piso, código postal, ciudad, provincia)
- [x] Teléfonos y email

### Firma Digital
- [x] Crear componente SignaturePad con canvas
- [x] Botón "Borrar firma" para limpiar canvas
- [x] Guardar firma como imagen base64 en base de datos
- [x] Mostrar firma guardada en vista de huéspedes

### Múltiples Huéspedes
- [x] Botón "Añadir Huésped (1/3)" para agregar segundo/tercer huésped
- [x] Cada huésped tiene su propio formulario completo
- [x] Indicar huésped principal con badge "Principal"
- [x] Todos los huéspedes comparten la misma reserva
- [x] Guardar todos los huéspedes en una sola transacción


## Mejoras Check-in Presencial (v89)

### Formulario Completo según Normativa Policial
- [x] Campos obligatorios de policía española (Real Decreto 933/2021):
- [x] Nombre y apellidos
- [x] Número de documento
- [x] Tipo de documento (Passport, DNI, NIE, Driving License)
- [x] Género (Masculino, Femenino, Otro)
- [x] Nacionalidad con desplegable + opción "Otro" (campo de texto libre)
- [x] Fecha de nacimiento
- [x] Fecha de expedición del documento
- [x] Dirección completa (compartida por todos los huéspedes de la reserva)
- [x] Teléfono y email

### Información de Reserva
- [x] Selector de habitación (desplegable con habitaciones existentes)
- [x] Auto-completar tipo de habitación al seleccionar número
- [x] Fecha entrada y salida
- [x] Número de reserva
- [x] Código hostel y código habitación
- [x] Número de habitaciones
- [x] Internet (Sí/No)
- [x] Régimen (S.A., A.D., M.P., P.C.)
- [x] Origen de reserva (Walk In, Booking.com, Airbnb, etc.)

### Información de Pago (Obligatoria)
- [x] Tipo de pago (Efectivo, Tarjeta, Transferencia, etc.)
- [x] Fecha de pago
- [x] Cantidad abonada
- [x] Cantidad pendiente
- [x] Medio de pago (Visa, Mastercard, PayPal, etc.)
- [x] Titular del pago

### Múltiples Huéspedes
- [x] Permitir añadir hasta 3 huéspedes por reserva
- [x] Botón "Añadir Huésped (1/3)"
- [x] Cada huésped con sus datos personales completos
- [x] Dirección compartida entre todos los huéspedes
- [x] Solo el huésped principal firma

### Firma Digital
- [x] Componente SignaturePad con canvas HTML5
- [x] Captura de firma con ratón o táctil
- [x] Botón "Borrar firma"
- [x] Guardar firma como base64 en BD
- [x] Solo el huésped principal debe firmar

### Header Informativo
- [x] Mostrar nombre del hostel
- [x] Mostrar RTA del hostel
- [x] Diseño "Welcome to our Home" según referencia

### Validación
- [x] Validar campos obligatorios antes de guardar
- [x] Validar que el huésped principal haya firmado
- [x] Validar fechas (entrada < salida)
- [x] Mensaje de error claro si falta información

### Backend
- [x] Verificar que schema tiene todos los campos necesarios
- [x] Ajustar procedimiento create para aceptar múltiples huéspedes
- [x] Guardar groupId para vincular huéspedes de la misma reserva
- [x] Marcar isPrincipal = true solo para el primer huésped

### Validación de Documentos según Nacionalidad
- [x] DNI: Solo para españoles
- [x] NIE: Solo para europeos
- [x] Carnet de conducir: Solo para españoles
- [x] ID Card: Solo para europeos
- [x] Pasaporte: Todos (obligatorio para no europeos)
- [x] Deshabilitar opciones de documento según nacionalidad seleccionada
- [x] Mostrar mensaje de ayuda cuando se selecciona nacionalidad

### Corrección de soporte documental
- [x] Limpiar el número de soporte en todos los formularios cuando un cambio de nacionalidad o tipo de documento deje de requerirlo
- [x] Eliminar la definición duplicada de Reino Unido para aplicar correctamente la regla de NIE solo europeo
- [x] Permitir para nacionalidad española DNI/NIF, NIE, carnet de conducir y pasaporte en todos los formularios de Check-in
- [x] Corregir el selector para que el carnet de conducir sea seleccionable en los formularios de Check-in
- [x] Aplicar en todos los Check-in Online: España con DNI/NIF, NIE, pasaporte y carnet; Europa con NIE, documento de identidad y pasaporte; terceros países solo con pasaporte
- [x] Ocultar DNI/NIF y NIE en el selector visual de Check-in Online para terceros países

## Importaciones externas
- [x] Crear menú administrativo de importaciones externas, independiente de los datos operativos actuales
- [x] Añadir configuración segura de Loyverse mediante secreto de entorno y validar la conexión
- [x] Crear almacenamiento aislado para ejecuciones y datos importados
- [x] Implementar importación manual inicial de cajas diarias de Loyverse
- [x] Preparar Cloudbeds como conexión OAuth inactiva y una estructura extensible para futuras importaciones
- [x] Crear una vista comparativa de cajas externas importadas y cierres internos sin fusionar los datos
- [x] Corregir la respuesta no JSON de Loyverse y cerrar correctamente las ejecuciones fallidas
- [x] Importar y agrupar los últimos 30 días de Loyverse con jornada operativa de 07:00 a 07:00
- [x] Añadir una guía de configuración segura de credenciales OAuth de Cloudbeds en Administración
- [x] Corregir la importación de Loyverse que termina completada con cero cierres pese a existir datos en la cuenta
- [x] Respetar el límite de 31 días de recibos de Loyverse y explicar el rango disponible antes de importar
- [x] Comparar siempre Loyverse solo con la caja de Tienda y eliminar el selector interno innecesario
- [x] Preparar la comparación futura de Cloudbeds con la caja de Hostel y su diferencia diaria
- [x] Añadir un botón en Caja de Tienda para importar la Z de Loyverse del día operativo 07:00–07:00
- [ ] Configurar la variable privada `CLOUDBEDS_API_KEY` cuando se genere en la propiedad
- [ ] Generar una API key de Cloudbeds con permisos mínimos de lectura y configurar su conexión segura
- [x] Implementar una importación aislada de la caja diaria de Cloudbeds y compararla con Hostel
- [ ] Verificar la primera importación real de Cloudbeds con la API key y Property ID activos
- [x] Corregir la importación de Cloudbeds que conecta pero finaliza con cero días
- [x] Registrar un diagnóstico seguro de los campos y recuentos devueltos por Cloudbeds cuando una importación queda vacía
- [ ] Desglosar y conciliar pagos de Cloudbeds frente a la caja de Hostel por método, anticipos, devoluciones y jornada operativa
- [x] Importar Cloudbeds por fecha de servicio y categorías de pago para coincidir con la Z de Hostel
- [ ] Ejecutar `SQL_IMPORTACIONES_EXTERNAS.sql` en el VPS antes de activar el módulo allí


## Mejoras Check-in Presencial (v31) - COMPLETADAS
- [x] Agregar campo issueDate (fecha de expedición) a schema de guests
- [x] Implementar validación de documentos según nacionalidad
  - [x] DNI (NIF): Solo españoles
  - [x] NIE: Solo europeos
  - [x] Pasaporte (PAS): Todos (obligatorio para no europeos)
  - [x] OTRO: Todos
- [x] Agregar selector de habitación con auto-completado de tipo
- [x] Implementar dirección compartida por todos los huéspedes
- [x] Agregar campo "Otro" en nacionalidad con texto libre
- [x] Implementar información de pago obligatoria según normativa
  - [x] Tipo de pago con códigos oficiales (EFECT, TARJT, PLATF, TRANS, MOVIL, TREG, DESTI, OTRO)
  - [x] Fecha de pago
  - [x] Cantidad abonada y pendiente
  - [x] Titular del pago
  - [x] Medio de pago (Visa, Mastercard, etc.)
- [x] Agregar firma digital solo para huésped principal
- [x] Permitir hasta 3 huéspedes por reserva
- [x] Crear archivo shared/countries.ts con códigos ISO alpha-3 y validaciones
- [x] Crear archivo POLICE_CODES_REFERENCE.md con documentación oficial
- [x] Implementar todos los campos según plantilla XML oficial de policía
- [x] Probar formulario completo en navegador


## Errores Check-in Presencial (v32) - CORREGIDOS
- [x] Canvas de firma: desalineación entre donde se firma y donde aparece la firma
- [x] Error de validación: "Invalid option" en gender (debe ser "male"/"female"/"other", no "H"/"M"/"O")
- [x] Error de validación: "Invalid option" en paymentType (códigos backend diferentes a frontend)
- [x] Fecha de entrada: debe incluir hora (formato: YYYY-MM-DDTHH:MM:SS)
- [x] Fecha de salida: por defecto debe ser +1 día de la entrada
- [x] Fecha de contrato: debe ser igual a fecha de check-in (no pedir, calcular)
- [x] Número de personas: calcular automáticamente según huéspedes agregados (no mostrar campo)
- [x] Número de habitaciones: por defecto 1, no mostrar campo
- [x] Fecha de caducidad tarjeta: solo mostrar si tipo de pago es Tarjeta
- [x] Quitar campos: Fecha de expedición y caducidad de documento (no los pide web oficial)


## Ajustes Check-in Presencial (v33) - COMPLETADOS
- [x] Hora de salida por defecto: día +1 a las 11:00
- [x] Origen de reserva por defecto: Booking.com
- [x] Tipo de pago por defecto: Transferencia
- [x] Fecha de pago por defecto: fecha de entrada
- [x] Titular del pago por defecto: nombre del huésped principal
- [x] Medio de pago por defecto: "Transferencia Booking"
- [x] Reordenar: información de pago DESPUÉS de huéspedes
- [x] Agregar campo "Número de Soporte" cuando se selecciona DNI (NIF)
- [x] Corregir canvas de firma: coordenadas del ratón escaladas correctamente
- [x] Corregir error al completar check-in: reservationOrigin debe ser "Booking.com" no "Booking"


## Errores 500 Backend
- [ ] Error al crear guest: fallo en inserción con muchos campos
- [ ] Error en dashboard: query COALESCE en tabla otros_gastos


## Error 500 al Crear Guest - CORREGIDO
- [x] Investigar error de inserción en tabla guests (muchos campos)
- [x] Corregir campos o validación que causa el error 500
- [x] Problema: checkInDate y checkOutDate se enviaban en formato datetime-local (YYYY-MM-DDTHH:MM)
- [x] Solución: Convertir a formato YYYY-MM-DD usando .split("T")[0] antes de enviar al backend


## Error al Crear Guest - Valores Inválidos
- [ ] Backend recibe campos con valores "default", "?", etc.
- [ ] Investigar por qué handleSubmit envía estos valores
- [ ] Corregir mapeo de campos para enviar solo valores válidos o undefined


## Error 500 al Crear Guest - CORREGIDO (v35)
- [x] Backend recibía checkInDate y checkOutDate en formato datetime-local (YYYY-MM-DDTHH:MM)
- [x] Schema esperaba formato YYYY-MM-DD (varchar(10))
- [x] Soluci\u00f3n: Convertir fechas usando .split("T")[0] antes de enviar al backend
- [x] Backend recibía amountPaid y amountPending como strings vacíos ""
- [x] Soluci\u00f3n: Convertir strings vacíos a "0" antes de enviar


## Error 500 Persistente al Crear Guest (v36) - CORREGIDO
- [x] Verificar que tabla guests en BD tenga todos los campos del schema
- [x] Ejecutar db:push para sincronizar schema con base de datos
- [x] Verificar campos faltantes en tabla guests
- [x] Problema: Campo issueDate estaba en schema de Drizzle pero no en BD
- [x] Solución: Eliminar issueDate del schema (no lo requiere web oficial de policía)


## Bugs Reportados (v38) - CORREGIDOS
- [x] Menú de Códigos de Acceso desapareció del menú principal (restaurado)
- [x] Gestión de Huéspedes: botón Ver implementado (modal con detalles completos)
- [x] Gestión de Huéspedes: botón Editar implementado (navega a /checkin/editar/:id)
- [x] Gestión de Huéspedes: botón PDF implementado (descarga ficha en formato texto)
- [x] Exportar Policía: botón XML ya estaba implementado, actualizado formato según plantilla oficial

## Ajustes Formulario Check-in
- [x] Cantidad Abonada: valor por defecto "0" (editable)
- [x] Cantidad Pendiente: valor por defecto "0" (editable)
- [ ] Agregar campo "Parentesco" SOLO cuando hay menores de edad (<18 años) - EN PROGRESO
- [ ] Calcular edad automáticamente desde fecha de nacimiento - EN PROGRESO
- [x] Documentar códigos oficiales de parentesco (HJ, NI, SB, PM, AB, HR, TU, OT)

## Funcionalidades CRUD Check-in
- [x] Implementar vista de detalles del check-in (modal con Dialog)
- [x] Implementar edición de check-in existente (reutilizar formulario)
- [x] Implementar exportación a PDF con todos los datos y firma
- [x] Implementar descarga de XML individual para subir a policía
- [x] Eliminación con diálogo de confirmación (ya implementado)
- [x] Conectar botones de acción en lista de check-ins (Ver, Editar, PDF, XML, Eliminar)


## Bugs Reportados (v40) - EN PROGRESO
- [x] Códigos de Acceso: Mover del menú principal a pestaña dentro de Check-in
- [x] Gestión de Huéspedes: Error al editar huésped (botón Editar no funciona) - Mensaje informativo temporal
- [x] Gestión de Huéspedes: Cambiar descarga de TXT a PDF profesional con firma incluida
- [x] Exportar Policía: No permite descargar el archivo XML - Mejorada validación y mensajes de error
- [x] Check-in Presencial: Agregar sección de condiciones y términos antes de la firma con checkbox de aceptación


## Bug Crítico (v41) - RESUELTO
- [x] Exportar Policía: XML sigue sin descargarse - Inicializar fechas con valores por defecto del mes actual

## Nueva Funcionalidad (v41) - COMPLETADO
- [x] Gestión de Huéspedes: Implementar modal de edición completo con formulario pre-rellenado
- [x] Backend: Crear endpoint para obtener datos completos de un huésped por ID - Ya existe getById
- [x] Backend: Crear endpoint para actualizar datos de un huésped existente - Ya existe update
- [x] Frontend: Modal de edición con todos los campos editables
- [x] Frontend: Validación y guardado de cambios

## Mejora PDF Huésped (v41) - COMPLETADO
- [x] Incluir declaración de aceptación de condiciones antes de la firma en el PDF
- [x] Mostrar checkbox marcado indicando que el huésped aceptó las condiciones
- [x] Incluir fecha y hora del check-in en la declaración


## Bug Formato XML (v42) - COMPLETADO
- [x] Exportar Policía: XML generado no es compatible con sistema oficial del Ministerio del Interior
- [x] Error: "Cannot find the declaration of element 'PARTES_VIAJEROS'" - Resuelto
- [x] Revisar archivos de referencia con implementación funcional - Plantilla oficial analizada
- [x] Corregir estructura XML según esquema XSD oficial - Formato ns2:peticion implementado


## Nuevas Funcionalidades Check-in (v43) - EN PROGRESO
- [x] Check-in Anticipado: Formulario web público para que huéspedes completen datos antes de llegar
- [x] Check-in Anticipado: Sin generación de códigos de acceso (solo recopilación de datos)
- [x] Check-in Anticipado: Validación de campos obligatorios y guardado en base de datos
- [x] Check-in Online: Sistema de auto check-in con generación automática de códigos
- [x] Check-in Online: Envío de códigos por email/SMS al huésped
- [x] Check-in Online: Interfaz pública accesible sin login
- [x] Backend: Endpoints para ambos tipos de check-in
- [x] Frontend: Interfaces públicas y privadas para gestión


## Bug Código Municipio XML (v44) - COMPLETADO
- [x] Exportar Policía: XML rechazado por código de municipio incorrecto [00000]
- [x] Agregar campo "Código Municipio INE" en configuración del hostel
- [x] Actualizar generación XML para usar código de municipio real del establecimiento
- [x] Validar que el código tenga 5 dígitos antes de generar XML

## Mejoras Check-in Anticipado (v46) - COMPLETADO
- [x] Pestaña "Anticipado": Mostrar lista de check-ins pendientes (estado "pending" + tipo "anticipado")
- [x] Check-ins completados pasan automáticamente a pestaña "Huéspedes" - Botón manual
- [x] Eliminar campos del formulario público (número de reserva, fecha de llegada, fecha de salida)
- [x] Agregar campo "Número de Soporte" obligatorio para DNI español (aparece en frontal)
- [x] Lista completa de nacionalidades (190+ países con códigos ISO)
- [x] Todos los campos obligatorios (mismos que check-in presencial)
- [x] Solo recopilar: datos de huéspedes + dirección (sin datos de reserva ni pago)
- [x] Agregar sección "Condiciones y Firma" con checkbox de aceptación al formulario público
- [x] Canvas de firma obligatorio en formulario público
- [x] Formulario completamente bil ingüe (español/inglés) con botón de cambio de idioma


## Mejoras Check-in Anticipado v47 - COMPLETADO
- [x] Agregar botón "Editar" en pestaña Check-in Anticipado para completar 100% de campos desde recepción
- [x] Cambiar pantalla final del formulario público por mensaje de agradecimiento bil ingüe
- [x] Incluir recordatorio de presentar documento original a la llegada
- [x] Eliminar botón que lleva al sistema del hostel, permitir solo cerrar ventana
- [x] Agregar campo "Día de llegada" (fecha de check-in) al formulario de Check-in Anticipado


## Nuevas Funcionalidades v48 - COMPLETADO
- [x] Modal de edición completo: Formulario emergente con todos los campos editables (datos personales, dirección, reserva, habitación, códigos, fechas)
- [x] Control de acceso: Menú Check-in visible solo para empleados (role=user) y administradores (role=admin)


## Nuevas Funcionalidades v49 - COMPLETADO
- [x] Corregir error de autenticación en check-in anticipado público (debe ser accesible sin login)
- [x] Implementar email de confirmación automático cuando un huésped complete el check-in anticipado (sin códigos de acceso, solo confirmación de datos recibidos)


## Mejoras Modal Edición Check-in Anticipado v50 - COMPLETADO
- [x] Selector de habitación: Desplegable con habitaciones disponibles (en lugar de texto libre)
- [x] Tipo de habitación: Campo obligatorio que se auto-completa al seleccionar habitación
- [x] Tipos de pago: Usar opciones oficiales de Hospederías (EFECT, TARJT, TRANS, PLATF, MOVIL, TREG, DESTI, OTRO)
- [x] Titular del pago: Por defecto "Titular de la reserva" (en lugar del nombre del huésped)


## Mejoras Modal Edición Check-in Anticipado v50 - COMPLETADO
- [x] Replicar exactamente los mismos campos del check-in presencial en el modal de edición
- [x] Selector de habitación con desplegable (habitaciones disponibles)
- [x] Tipo de habitación obligatorio (auto-completa al seleccionar habitación)
- [x] Tipos de pago oficiales de Hospederías (EFECT, TARJT, TRANS, PLATF, MOVIL, TREG, DESTI, OTRO)
- [x] Titular del pago por defecto "Titular de la reserva"


## Correcciones Modal Check-in Anticipado v51 - COMPLETADO
- [x] Ocultar campos "Código de Habitación" y "Código de Entrada" (solo para check-in presencial con llaves físicas)
- [x] Corregir error de validación: backend espera códigos de pago (TRANS, EFECT, etc.) no texto descriptivo
- [x] Mostrar firma del huésped en el modal de detalles del check-in anticipado
- [x] Enviar email a recepción (thespotcentralhostel@gmail.com) cuando se recibe un check-in anticipado
- [x] Titular del pago: Mostrar nombre completo del huésped por defecto al editar
- [x] Valores por defecto al editar: Tipo de pago TRANS, Fecha check-in del huésped a las 11:00, Check-out +1 día a las 11:00, Origen Booking.com


## Corrección Fechas Modal Edición v52 - COMPLETADO
- [x] Fecha de pago por defecto: fecha del check-in (sin hora)
- [x] Convertir fechas datetime-local a formato YYYY-MM-DD antes de enviar al backend


## Correcciones Check-in Anticipado v53 - EN PROGRESO
- [x] PDF incompleto: reorganizar campos en dos columnas para que quepa todo en un folio
- [x] Firma cortada en PDF: ajustar tamaño y posición
- [x] Opciones de sexo: cambiar a "Hombre", "Mujer", "Otro" (en español)
- [x] Firma desalineada: corregir offset del cursor en canvas (ajustada escala)
- [x] Email bilingüe: verificar que funciona correctamente (ya implementado)
- [x] Filtrado check-ins: los no completados solo en "Anticipado", no en "Huéspedes"
- [x] Origen de reserva: verificar que aparece Booking.com por defecto
- [x] Código municipio INE: usar código postal del huésped (ya no necesita configuración)


## Corrección Limpieza Manual v57 - COMPLETADO

- [x] Agregar endpoint manual cleanupOldGuests en backend (sin cron)
- [x] Agregar botón "Limpiar Registros Antiguos" en ExportarPolicia.tsx
- [x] Compilar y probar que el servidor arranca correctamente
- [x] Crear paquete ZIP para despliegue en VPS


## Bug Reportado v57b - IDENTIFICADO

- [x] Menú de check-in se queda cargando infinitamente (loading spinner)
- [x] Investigar qué consulta está fallando o tardando demasiado
- [x] Causa: Faltan tablas `guests` y `hostel_settings_checkin` en base de datos de producción
- [x] Crear script SQL para crear las tablas faltantes
- [ ] Ejecutar script en phpMyAdmin de producción


## Corrección Script SQL v57c - COMPLETADO

- [x] Error al ejecutar script: columna `hostelName` no existe
- [x] Investigar estructura actual de tabla hostel_settings_checkin en producción
- [x] Crear script SQL que renombre columnas existentes y agregue faltantes
- [ ] Usuario debe ejecutar script corregido en phpMyAdmin


## Verificación Sistema Check-in v57d - EN PROGRESO

- [x] Check-in funciona correctamente ✅
- [x] Códigos funciona correctamente ✅
- [x] Config funciona correctamente ✅
- [x] Verificar qué secciones no funcionan
- [ ] Huéspedes - loading infinito ❌
- [ ] Anticipado - loading infinito ❌
- [ ] Policía - loading infinito ❌
- [x] Identificar qué consultas fallan en estas secciones
- [x] Causa: Tabla guests tiene estructura diferente, faltan 13 columnas
- [x] Agregar columnas faltantes a tabla guests en producción (script SQL creado)
- [ ] Probar que las secciones cargan correctamente


## Warning React Keys Duplicadas - EN PROGRESO

- [x] Warning: "Encountered two children with the same key, 'GBR'"
- [x] Buscar dónde se usa 'GBR' como key en componentes de check-in
- [x] Corregir usando keys únicas (índice + valor o ID único)


## Error Validación paymentType - EN PROGRESO

- [x] Error al completar check-in: "Invalid option: expected one of EFECT, TARJT, TRANS..."
- [x] Causa: paymentData.paymentType tiene valor "Transferencia" (español) en lugar de "TRANS" (código)
- [x] Cambiar valor por defecto de "Transferencia" a "TRANS"
- [x] Corregir Select para usar códigos del enum (EFECT, TARJT, TRANS, etc.)
- [x] Corregir condición de "Tarjeta" a "TARJT"
- [ ] Usuario debe probar que el check-in se complete correctamente


## Error Columnas Duplicadas SQL - EN PROGRESO

- [ ] Error al ejecutar script: "Nombre duplicado de columna 'documentExpiry'"
- [ ] Algunas columnas ya existen en producción
- [ ] Crear script SQL con verificación IF NOT EXISTS para cada columna
- [ ] Probar script corregido


## Problemas Check-in Online y PDFs - EN PROGRESO

- [x] Check-in online no aparece en la vista "Exportar Policía"
- [x] No se generan PDFs automáticamente al completar check-in (ni presencial ni online)
- [x] Investigar filtro en consulta de Exportar Policía
- [x] Investigar si la función de generación de PDF se está llamando
- [x] Corregir ambos problemas


## Bugs y Mejoras Check-in (v57)
- [x] Implementar generación automática de PDF al completar check-in (presencial/online/anticipado)
- [x] Filtrar vista de Policía para mostrar solo check-ins completados
- [x] Agregar botón de eliminar individual para cada registro en vista Policía

## Mejoras de gastos, facturas y proveedores
- [x] Permitir asignar cada otro gasto o ingreso al Hostel o a la Tienda.
- [x] Hacer obligatorio el proveedor al registrar una factura.
- [x] Crear menú de gestión de proveedores: añadir, editar y eliminar.
- [x] Añadir el filtro "Últimos 3 meses" en Facturas y Otros gastos.
- [x] Reconocer automáticamente los datos de facturas adjuntas y dejar campos vacíos cuando no se detecten.
- [x] Permitir arrastrar y soltar documentos para crear una factura.
- [x] Incluir script SQL seguro para crear app_settings si falta en el VPS.

## Corrección de despliegue OCR
- [x] Corregir el error "No procedure found on path ocr.processInvoiceFile" por desajuste entre el cliente y el servidor desplegados.

## Corrección gráfico de disponibilidad
- [x] Restaurar el histórico de disponibilidad por semanas con fecha real en el eje horizontal.
- [x] Corregir la agrupación anual para no mezclar ni omitir semanas de distintos años.

## Mejora OCR y proveedores comerciales
- [x] Añadir un campo opcional de nombre legal en la ficha de proveedor.
- [x] Asociar automáticamente el nombre legal reconocido al proveedor comercial correspondiente.
- [x] Mejorar la detección del importe total a pagar en facturas adjuntas.

## Histórico diario de cajas
- [x] Añadir una vista anual con ventas diarias separadas para Hostel y Tienda.

## Carga manual de facturas
- [x] Permitir abrir el selector de archivos al hacer clic en la zona de arrastrar factura.

## Check-in Online
- [x] Auditar y completar el flujo de Check-in Online con enlace público.
- [x] Permitir a recepción generar y gestionar enlaces de check-in online.
- [x] Crear formulario público de check-in online con validaciones.
- [x] Entregar códigos de acceso tras completar el check-in online.
- [x] Integrar check-ins online con PDF, exportación de policía y limpieza manual.

## Mejoras de configuración, check-in y policía
- [x] Configurar URLs públicas para condiciones, términos y protección de datos.
- [x] Corregir la persistencia del código postal INE en Configuración.
- [x] Añadir instrucciones de bienvenida bilingües configurables para el check-in online.
- [x] Añadir un selector visual ENGLISH / ESPAÑOL en la cabecera del enlace público.
- [x] Permitir abrir, imprimir y guardar como PDF cada registro desde Policía.

## Correo de Check-in Online
- [x] Incluir de forma explícita el código de acceso al hostel y el código de habitación en el correo al huésped.

## Confirmación e idioma de formularios públicos
- [x] Mostrar el código de entrada al hostel también en la pantalla final de Check-in Online.
- [x] Añadir selector visual ESPAÑOL / ENGLISH al Check-in Anticipado público.

## Rol Tablet y registro policial
- [x] Añadir rol Tablet con acceso restringido al registro policial.
- [x] Crear formulario Tablet para registrar uno o varios huéspedes de una misma reserva.
- [x] Validar los campos imprescindibles para Policía antes de guardar.
- [x] Añadir escaneo opcional y temporal de DNI, ID o pasaporte para rellenar campos.
- [x] Informar que las imágenes de documentos no se almacenan tras el reconocimiento.

## Rediseño autoservicio Tablet
- [x] Crear diseño profesional con identidad visual del hostel y logotipo en cabecera.
- [x] Añadir selector visual Español / English y traducción de todo el flujo.
- [x] Eliminar datos internos de reserva, habitación, pago e importe del formulario del huésped.
- [x] Usar entrada hoy y salida mañana automáticamente en el registro Tablet.
- [x] Abrir la cámara del dispositivo para escanear documentos de forma opcional.
- [x] Separar aceptación de términos y privacidad con enlaces legales obligatorios.

## Escaneo doble de documentos
- [x] Permitir capturar anverso y reverso para cada huésped.
- [x] Combinar reconocimientos sin borrar los datos existentes válidos.

## Usabilidad Tablet
- [x] Añadir un botón de "Añadir otro huésped" al final de cada ficha de huésped.

## Guía de llegada Check-in Online
- [x] Añadir una guía de llegada bilingüe y estructurada a la confirmación final.
- [x] Permitir configurar los textos de ubicación, llave, Wi‑Fi, zonas comunes, normas y contacto.
- [x] Incluir automáticamente nombre, habitación, planta, tipo de habitación y códigos de acceso.
- [x] Incluir la guía de llegada también en el correo de confirmación.

## Personalización y envío de guía de llegada
- [x] Permitir etiquetas dinámicas de huésped, habitación y códigos en textos bilingües de bienvenida.
- [x] Garantizar que cada huésped visualice la versión española o inglesa elegida al inicio.
- [x] Añadir acciones para compartir las instrucciones por correo electrónico y WhatsApp.

## Corrección de persistencia de guía de llegada
- [x] Corregir que los textos de guía de llegada se guarden y se recuperen al volver a Configuración.

## Corrección de confirmación Check-in Online
- [x] Ocultar el mensaje inicial de bienvenida después de completar el check-in.
- [x] Mantener accesible la guía de llegada desde el enlace hasta el día siguiente.

## Envío de enlace Check-in Online
- [x] Añadir botón para compartir por WhatsApp al generar un enlace de Check-in Online.

## Prioridad activa: pedidos e inventario
- [x] Auditar y consolidar la base existente de productos, inventario y pedidos.
- [x] Confirmar que ya existe una primera versión operativa de productos y pedidos a proveedor.
- [x] Preparar la migración de guía de llegada para ejecutar en producción.

## Corrección de rol Tablet
- [x] Excluir usuarios Tablet de horarios, calendarios y selectores de turnos.

## Mejoras de Check-in Online y Anticipado
- [x] Mejorar la usabilidad móvil del formulario de Check-in Online.
- [x] Ajustar automáticamente los huéspedes al tipo de habitación y permitir completar todos los integrantes del grupo.
- [x] Traducir al inglés el mensaje de WhatsApp cuando el huésped eligió inglés.
- [x] Garantizar el email a recepción al completar un Check-in Anticipado, con todos los datos del huésped.

## Correcciones de guía y enlaces online
- [x] Traducir tipo de habitación y planta correctamente en la guía en inglés.
- [x] Mostrar la dirección completa con enlace a Google Maps.
- [x] Corregir la copia de enlaces creados en dispositivos móviles.

## Correcciones urgentes de Check-in Online
- [x] Permitir crear enlace sin email y exigir que el huésped lo complete en el formulario público.
- [x] Establecer Booking.com y Plataforma como valores predeterminados al crear enlace.
- [x] Añadir el logotipo del hostel en la cabecera del formulario público.
- [x] Corregir el error que impide completar reservas con varios huéspedes.

## Ajuste de correo Check-in Online
- [x] Retirar el bloque azul de bienvenida del correo enviado tras completar el Check-in Online.

## Correcciones Check-in Anticipado
- [x] Ampliar y adaptar el diálogo de editar/revisar para evitar solapamiento de campos.
- [x] Corregir el guardado cuando el sexo del huésped está vacío o no seleccionado.
- [x] Evitar que una fecha inválida bloquee la apertura del editor de Check-in Anticipado.

## Validación de documentos de Check-in
- [x] Exigir número de soporte para DNI/NIF y NIE en Tablet, Online y Check-in Anticipado.
- [x] Ocultar y no validar número de soporte para Pasaporte y Otros en esos flujos.
- [x] Corregir el campo de soporte que no aparece al seleccionar NIE.
- [x] Mostrar el campo de soporte para NIE en Check-in Presencial y Tablet.
- [x] Exigir soporte para NIE solo si la nacionalidad seleccionada es europea.

## Identificación de versión
- [x] Mostrar una versión y fecha de compilación discretas en la interfaz de administración.

## Orden de trabajadores en Turnos
- [x] Permitir definir y guardar el orden de aparición de trabajadores en el calendario.

## Facturas emitidas
- [x] Crear y subir facturas emitidas desde Facturas, de forma separada de las recibidas.
- [x] Permitir seleccionar The Spot Central Hostel, Sweet & Salty u Organizus al registrar una factura emitida.
- [x] Guardar el archivo local con el prefijo EMITIDA y el formato de negocio, trimestre y fecha indicado.
- [x] Reorganizar los botones de nueva factura: recibida al 75% y emitida al 25%.
- [x] Mover el listado de facturas emitidas al final de la página.

## Informes de horas en Turnos
- [x] Exportar un PDF mensual con las horas de todos los trabajadores.
- [x] Exportar un PDF de un trabajador concreto para uno o varios meses seleccionados.
- [x] Desglosar en el PDF las horas de cada mes y el total acumulado cuando se seleccionen varios meses.
