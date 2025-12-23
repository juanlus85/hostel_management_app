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
- [ ] Crear procedimiento tRPC para enviar notificaciones cuando se registra checkout
- [ ] Integrar notificaciones en el flujo de actualización de estado en Housekeeping
- [ ] Notificar a todos los usuarios con rol "housekeeping"
- [ ] Incluir número de habitación y fecha en la notificación


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
- [ ] Modificar Incidencias para mostrar datos de ambos negocios cuando se selecciona "Ambos"
- [ ] Modificar Tareas para mostrar datos de ambos negocios cuando se selecciona "Ambos"
- [ ] Modificar Inventario para mostrar datos de ambos negocios cuando se selecciona "Ambos"
- [ ] Verificar que todas las páginas muestren correctamente datos combinados

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
- [ ] Resumen Semanal: agregar desglose diario de efectivo retirado (backend listo, falta frontend)

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
- [ ] Crear tabla safe_boxes en schema (fecha, tipología, concepto, cantidad, acumulado, chequeo, businessId)
- [ ] Crear procedimientos tRPC para listar, crear, actualizar y eliminar movimientos
- [ ] Crear página CajasF.tsx con tabs (C.F. Hostel, C.F. Tienda)
- [ ] Implementar formulario para agregar movimientos
- [ ] Mostrar tabla con últimas 30 entradas
- [ ] Agregar menú "Cajas F" solo visible para admin


## Nueva Feature v51 - Cajas F
- [x] Crear tabla safe_boxes en schema
- [x] Crear procedimientos tRPC para CRUD de movimientos
- [x] Crear página CajasF.tsx con tabs Hostel/Tienda
- [x] Agregar menú Cajas F (solo admin)

## Nueva Feature v52 - Códigos de Acceso
- [ ] Crear tabla access_codes en schema
- [ ] Crear procedimientos tRPC para CRUD de códigos
- [ ] Crear página CodigosAcceso.tsx con tabla de habitaciones
- [ ] Agregar menú Códigos de Acceso (visible para todos, editable solo admin)


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
- [ ] Agregar gráfico histórico de disponibilidad total (pendiente)

## Bug v55
- [x] Rol housekeeping no puede ver menú Códigos de Acceso (debería poder verlo en modo lectura)
