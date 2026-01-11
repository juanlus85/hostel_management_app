# Guía de Deployment - Hostel Management System

## 📋 Requisitos del Servidor VPS

- **Sistema Operativo**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **Node.js**: v22.x o superior
- **pnpm**: v9.x o superior
- **Base de datos**: MySQL 8.0+ o compatible (TiDB, MariaDB)
- **Memoria RAM**: Mínimo 2GB recomendado
- **Espacio en disco**: Mínimo 5GB libre

---

## 🚀 Pasos de Instalación

### 1. Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar PM2 para gestión de procesos
npm install -g pm2
```

### 2. Subir Archivos al Servidor

```bash
# Desde tu máquina local, comprimir la carpeta deployment
cd /ruta/a/hostel_management_app
tar -czf deployment.tar.gz deployment/

# Subir al servidor (reemplaza user@your-server-ip)
scp deployment.tar.gz user@your-server-ip:/home/user/

# En el servidor, descomprimir
cd /home/user
tar -xzf deployment.tar.gz
cd deployment
```

### 3. Configurar Variables de Entorno

Crear archivo `.env` en la carpeta `deployment/`:

```bash
# Base de datos
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/hostel_db"

# JWT Secret (generar uno aleatorio)
JWT_SECRET="tu_secreto_jwt_muy_seguro_aqui"

# OAuth (si usas Manus OAuth, sino configurar tu propio sistema)
VITE_APP_ID="tu_app_id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://login.manus.im"
OWNER_OPEN_ID="tu_owner_id"
OWNER_NAME="Tu Nombre"

# APIs de Manus (si las usas)
BUILT_IN_FORGE_API_URL="https://forge.manus.im"
BUILT_IN_FORGE_API_KEY="tu_api_key"
VITE_FRONTEND_FORGE_API_KEY="tu_frontend_api_key"
VITE_FRONTEND_FORGE_API_URL="https://forge.manus.im"

# Configuración de la aplicación
VITE_APP_TITLE="The Spot Central Hostel"
VITE_APP_LOGO="/logo.png"

# Puerto del servidor
PORT=3000

# Entorno
NODE_ENV=production
```

### 4. Instalar Dependencias

```bash
cd /home/user/deployment
pnpm install --prod
```

### 5. Configurar Base de Datos

```bash
# Crear base de datos
mysql -u root -p
CREATE DATABASE hostel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hostel_user'@'localhost' IDENTIFIED BY 'contraseña_segura';
GRANT ALL PRIVILEGES ON hostel_db.* TO 'hostel_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Aplicar migraciones
pnpm db:push
```

### 6. Iniciar la Aplicación con PM2

```bash
# Crear archivo ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'hostel-app',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

# Crear carpeta de logs
mkdir -p logs

# Iniciar aplicación
pm2 start ecosystem.config.js

# Configurar PM2 para auto-inicio
pm2 startup
pm2 save
```

### 7. Configurar Nginx como Reverse Proxy

```bash
# Instalar Nginx
sudo apt install -y nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/hostel-app

# Contenido del archivo:
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Activar configuración
sudo ln -s /etc/nginx/sites-available/hostel-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Configurar SSL con Let's Encrypt (Opcional pero Recomendado)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com

# Renovación automática ya está configurada
```

---

## 🔄 Actualización de la Aplicación

```bash
# Detener aplicación
pm2 stop hostel-app

# Hacer backup de la base de datos
mysqldump -u hostel_user -p hostel_db > backup_$(date +%Y%m%d).sql

# Subir nuevos archivos (desde tu máquina local)
scp deployment.tar.gz user@your-server-ip:/home/user/
ssh user@your-server-ip
cd /home/user
tar -xzf deployment.tar.gz
cd deployment
pnpm install --prod

# Aplicar migraciones si hay cambios en la BD
pnpm db:push

# Reiniciar aplicación
pm2 restart hostel-app
```

---

## 📊 Monitoreo

```bash
# Ver logs en tiempo real
pm2 logs hostel-app

# Ver estado de la aplicación
pm2 status

# Ver métricas
pm2 monit

# Reiniciar si hay problemas
pm2 restart hostel-app
```

---

## 🗂️ Estructura de Archivos en Producción

```
deployment/
├── dist/                    # Código compilado
│   ├── index.js            # Servidor backend
│   └── public/             # Frontend estático
├── drizzle/                # Schema y migraciones de BD
├── server/                 # Código fuente del servidor
├── shared/                 # Código compartido
├── Registros/              # PDFs generados automáticamente
├── package.json
├── pnpm-lock.yaml
├── .env                    # Variables de entorno (CREAR)
└── ecosystem.config.js     # Configuración PM2 (CREAR)
```

---

## ⚠️ Notas Importantes

1. **Seguridad**:
   - Cambiar todos los secretos y contraseñas por defecto
   - Configurar firewall (ufw) para permitir solo puertos 80, 443, 22
   - Mantener el sistema actualizado

2. **Backups**:
   - Configurar backups automáticos de la base de datos
   - Los PDFs en `Registros/` se conservan automáticamente

3. **Tarea Programada**:
   - La limpieza automática de huéspedes (3 días) se ejecuta a las 3:00 AM
   - Verificar que PM2 esté configurado para auto-inicio

4. **Email**:
   - Configurar servidor SMTP si quieres enviar emails reales
   - Actualmente usa el sistema de Manus (si está configurado)

---

## 🆘 Solución de Problemas

### La aplicación no inicia
```bash
# Verificar logs
pm2 logs hostel-app --lines 100

# Verificar variables de entorno
cat .env

# Verificar conexión a BD
mysql -u hostel_user -p hostel_db
```

### Error de permisos en Registros/
```bash
# Dar permisos a la carpeta
chmod 755 Registros/
chown -R $USER:$USER Registros/
```

### Nginx muestra 502 Bad Gateway
```bash
# Verificar que la app esté corriendo
pm2 status

# Verificar logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 📞 Soporte

Para problemas técnicos o dudas sobre el deployment, contactar con el desarrollador.
