# Guía de Despliegue en Plesk

## Hostel & Tienda Management System
**Dominio destino:** `management.thespotcentralhostel.com`

---

## Requisitos Previos

- VPS con Plesk instalado
- Node.js 18+ habilitado en Plesk
- Base de datos MySQL disponible
- Acceso SSH al servidor (opcional pero recomendado)

---

## Paso 1: Preparar el Dominio en Plesk

1. **Accede a Plesk** y ve a "Websites & Domains"
2. **Añade el subdominio** `management.thespotcentralhostel.com`
3. **Activa Node.js** para este dominio:
   - Click en "Node.js" en el panel del dominio
   - Selecciona versión Node.js 18 o superior
   - Document root: `/httpdocs`
   - Application root: `/`
   - Application startup file: `server/_core/index.js` (después del build será `dist/server/index.js`)

4. **Activa SSL con Let's Encrypt**:
   - Ve a "SSL/TLS Certificates"
   - Click en "Install" junto a Let's Encrypt
   - Marca "Redirect from http to https"

---

## Paso 2: Crear Base de Datos MySQL

1. En Plesk, ve a "Databases"
2. Click en "Add Database"
3. Configura:
   - **Database name:** `hostel_management`
   - **Database user:** `hostel_admin`
   - **Password:** (genera una contraseña segura)
4. Anota estos datos para las variables de entorno

---

## Paso 3: Preparar el Código para Producción

### En tu máquina local o en Manus:

```bash
# 1. Instalar dependencias
pnpm install

# 2. Compilar el proyecto
pnpm build

# 3. Los archivos compilados estarán en:
#    - dist/client/  (frontend estático)
#    - dist/server/  (backend Node.js)
```

### Archivos a subir al servidor:

```
/httpdocs/
├── dist/
│   ├── client/          # Frontend compilado
│   └── server/          # Backend compilado
├── drizzle/
│   └── migrations/      # Migraciones de BD
├── node_modules/        # Dependencias (o instalar en servidor)
├── package.json
├── pnpm-lock.yaml
└── .env                 # Variables de entorno (crear en servidor)
```

---

## Paso 4: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con estas variables:

```env
# Entorno
NODE_ENV=production
PORT=3000

# Base de datos MySQL (datos de Plesk)
DATABASE_URL=mysql://hostel_admin:TU_PASSWORD@localhost:3306/hostel_management

# Autenticación
JWT_SECRET=genera_una_clave_secreta_larga_y_aleatoria_aqui

# OAuth Manus (si usas login con Manus)
VITE_APP_ID=tu_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login

# Información del propietario
OWNER_OPEN_ID=tu_open_id
OWNER_NAME=Juan Luis Blanco Guzmán

# APIs de Manus (para LLM, Storage, etc.)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=tu_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=tu_frontend_api_key

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=

# Título de la app
VITE_APP_TITLE=Hostel & Tienda Management System
VITE_APP_LOGO=
```

### En Plesk:
1. Ve a la configuración de Node.js del dominio
2. En "Environment Variables", añade cada variable

---

## Paso 5: Subir Archivos al Servidor

### Opción A: Via File Manager de Plesk
1. Ve a "Files" en el dominio
2. Sube los archivos a `/httpdocs/`

### Opción B: Via SFTP
```bash
sftp usuario@tu-servidor
put -r dist/ /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs/
```

### Opción C: Via SSH + Git
```bash
ssh usuario@tu-servidor
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs/
git clone tu-repositorio .
pnpm install --production
pnpm build
```

---

## Paso 6: Instalar Dependencias en el Servidor

Si no subiste `node_modules`:

```bash
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs/
pnpm install --production
```

---

## Paso 7: Ejecutar Migraciones de Base de Datos

```bash
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs/
pnpm db:push
```

Esto creará todas las tablas necesarias en la base de datos.

---

## Paso 8: Configurar Node.js en Plesk

1. Ve a "Node.js" en el panel del dominio
2. Configura:
   - **Node.js version:** 18.x o superior
   - **Application mode:** Production
   - **Application root:** `/httpdocs`
   - **Application startup file:** `dist/server/index.js`
3. Click en "Enable Node.js"
4. Click en "Restart" para iniciar la aplicación

---

## Paso 9: Configurar PM2 (Recomendado)

PM2 mantiene la aplicación corriendo y la reinicia si falla.

### Instalar PM2 globalmente:
```bash
npm install -g pm2
```

### Usar el archivo ecosystem.config.js incluido:
```bash
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs/
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Paso 10: Verificar el Despliegue

1. Visita `https://management.thespotcentralhostel.com`
2. Verifica que la página carga correctamente
3. Prueba el login
4. Verifica que las funciones principales funcionan

---

## Solución de Problemas

### La aplicación no inicia
```bash
# Ver logs de la aplicación
pm2 logs hostel-management

# O en Plesk, revisa los logs de Node.js
```

### Error de conexión a base de datos
- Verifica que DATABASE_URL es correcta
- Asegúrate de que el usuario tiene permisos en la BD
- Comprueba que MySQL está corriendo

### Error 502 Bad Gateway
- La aplicación Node.js no está corriendo
- Reinicia desde Plesk o con `pm2 restart all`

### Archivos estáticos no cargan
- Verifica que `dist/client/` existe y tiene los archivos
- Comprueba los permisos de los archivos

---

## Actualizaciones Futuras

Para actualizar la aplicación:

1. **En Manus:** Haz los cambios y pruebas
2. **Descarga el código** actualizado
3. **En el servidor:**
   ```bash
   cd /var/www/vhosts/.../httpdocs/
   # Sube los nuevos archivos
   pnpm install
   pnpm build
   pnpm db:push  # Si hay cambios en BD
   pm2 restart all
   ```

---

## Contacto y Soporte

Si tienes problemas con el despliegue, puedes:
1. Revisar los logs en Plesk
2. Contactar con el soporte de Plesk
3. Consultar la documentación de Node.js en Plesk

