# Variables de Entorno - Hostel Management System

## Configuración para Despliegue en Plesk

Este documento lista todas las variables de entorno necesarias para desplegar la aplicación en tu servidor.

---

## Variables Requeridas

### Base de Datos

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Conexión MySQL completa | `mysql://usuario:password@localhost:3306/hostel_management` |

### Autenticación

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `JWT_SECRET` | Clave secreta para tokens JWT (mín. 32 caracteres) | `tu_clave_secreta_muy_larga_aqui` |

### Entorno

| Variable | Descripción | Valor |
|----------|-------------|-------|
| `NODE_ENV` | Modo de ejecución | `production` |
| `PORT` | Puerto del servidor | `3000` |

---

## Variables Opcionales (Funciones Avanzadas)

### OAuth Manus (Login con cuenta Manus)

| Variable | Descripción |
|----------|-------------|
| `VITE_APP_ID` | ID de la aplicación en Manus |
| `OAUTH_SERVER_URL` | URL del servidor OAuth (`https://api.manus.im`) |
| `VITE_OAUTH_PORTAL_URL` | URL del portal de login (`https://manus.im/login`) |

### APIs de Manus (OCR, Storage, Notificaciones)

| Variable | Descripción |
|----------|-------------|
| `BUILT_IN_FORGE_API_URL` | URL de la API de Manus |
| `BUILT_IN_FORGE_API_KEY` | API Key del servidor |
| `VITE_FRONTEND_FORGE_API_URL` | URL de la API para frontend |
| `VITE_FRONTEND_FORGE_API_KEY` | API Key del frontend |

> **Nota:** Sin estas APIs, las siguientes funciones no estarán disponibles:
> - OCR automático de facturas
> - Almacenamiento de archivos en la nube (S3)
> - Notificaciones push

### Información del Propietario

| Variable | Descripción |
|----------|-------------|
| `OWNER_OPEN_ID` | ID del propietario en Manus |
| `OWNER_NAME` | Nombre del propietario |

### Configuración de la App

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `VITE_APP_TITLE` | Título de la aplicación | `Hostel & Tienda Management System` |
| `VITE_APP_LOGO` | URL del logo | (vacío) |

### Analytics (Opcional)

| Variable | Descripción |
|----------|-------------|
| `VITE_ANALYTICS_ENDPOINT` | Endpoint de analytics |
| `VITE_ANALYTICS_WEBSITE_ID` | ID del sitio web |

---

## Cómo Configurar en Plesk

### Método 1: Panel de Node.js

1. Ve a **Websites & Domains** > **management.thespotcentralhostel.com**
2. Click en **Node.js**
3. En la sección **Environment Variables**, añade cada variable

### Método 2: Archivo .env

1. Crea un archivo `.env` en la raíz del proyecto
2. Añade las variables en formato `VARIABLE=valor`
3. Asegúrate de que el archivo NO se suba a Git

---

## Generar JWT_SECRET

Puedes generar una clave secreta segura con:

```bash
# Linux/Mac
openssl rand -base64 32

# O visita
https://generate-secret.vercel.app/32
```

---

## Configuración de Base de Datos en Plesk

1. Ve a **Databases** en Plesk
2. Click en **Add Database**
3. Crea:
   - **Nombre:** `hostel_management`
   - **Usuario:** `hostel_admin`
   - **Password:** (genera una segura)
4. La URL será: `mysql://hostel_admin:TU_PASSWORD@localhost:3306/hostel_management`

---

## Verificar Configuración

Después de configurar las variables, puedes verificar que todo está correcto:

```bash
# En el servidor, ejecuta:
node -e "console.log(process.env.DATABASE_URL ? 'DB OK' : 'DB MISSING')"
node -e "console.log(process.env.JWT_SECRET ? 'JWT OK' : 'JWT MISSING')"
```

---

## Solución de Problemas

### Error: "DATABASE_URL is not defined"
- Verifica que la variable está configurada en Plesk
- Reinicia la aplicación Node.js

### Error: "Invalid JWT_SECRET"
- Asegúrate de que JWT_SECRET tiene al menos 32 caracteres
- No uses caracteres especiales que puedan causar problemas

### Las APIs de Manus no funcionan
- Contacta con Manus para obtener las API keys
- O desactiva las funciones que las requieren
