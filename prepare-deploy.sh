#!/bin/bash

# ============================================
# Script de Preparación para Despliegue
# Hostel & Tienda Management System
# ============================================

set -e  # Detener si hay errores

echo "🚀 Preparando archivos para despliegue en Plesk..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorio de salida
DEPLOY_DIR="deploy-package"

# Paso 1: Limpiar directorio anterior
echo -e "${BLUE}[1/6]${NC} Limpiando directorio anterior..."
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Paso 2: Instalar dependencias
echo -e "${BLUE}[2/6]${NC} Instalando dependencias..."
pnpm install

# Paso 3: Compilar el proyecto
echo -e "${BLUE}[3/6]${NC} Compilando proyecto..."
pnpm build

# Paso 4: Copiar archivos necesarios
echo -e "${BLUE}[4/6]${NC} Copiando archivos al paquete de despliegue..."

# Copiar archivos compilados
mkdir -p $DEPLOY_DIR/dist/server
mkdir -p $DEPLOY_DIR/dist/client

# Copiar frontend compilado (public contiene los archivos estáticos)
if [ -d "dist/public" ]; then
  cp -r dist/public/* $DEPLOY_DIR/dist/client/
fi

# Copiar backend compilado
if [ -f "dist/index.js" ]; then
  cp dist/index.js $DEPLOY_DIR/dist/server/
fi

# Copiar migraciones de base de datos
mkdir -p $DEPLOY_DIR/drizzle
cp -r drizzle/migrations $DEPLOY_DIR/drizzle/ 2>/dev/null || echo "No hay migraciones"
cp drizzle/schema.ts $DEPLOY_DIR/drizzle/ 2>/dev/null || true

# Copiar archivos de configuración
cp package.json $DEPLOY_DIR/
cp pnpm-lock.yaml $DEPLOY_DIR/
cp ecosystem.config.js $DEPLOY_DIR/
cp drizzle.config.ts $DEPLOY_DIR/
cp seed-businesses.mjs $DEPLOY_DIR/ 2>/dev/null || echo "  ⚠ seed-businesses.mjs no encontrado"

# Copiar documentación (si existe)
cp DEPLOY_PLESK.md $DEPLOY_DIR/ 2>/dev/null || echo "  ⚠ DEPLOY_PLESK.md no encontrado"
cp ENV_VARIABLES.md $DEPLOY_DIR/ 2>/dev/null || echo "  ⚠ ENV_VARIABLES.md no encontrado"
cp CHECKLIST_DESPLIEGUE.md $DEPLOY_DIR/ 2>/dev/null || echo "  ⚠ CHECKLIST_DESPLIEGUE.md no encontrado"
cp README.md $DEPLOY_DIR/ 2>/dev/null || echo "  ⚠ README.md no encontrado (opcional)"

# Crear archivo .env de ejemplo
cat > $DEPLOY_DIR/.env.example << 'EOF'
# ============================================
# VARIABLES DE ENTORNO - CONFIGURAR EN PLESK
# ============================================

NODE_ENV=production
PORT=3000

# Base de datos (crear en Plesk)
DATABASE_URL=mysql://usuario:password@localhost:3306/hostel_management

# Seguridad (generar con: openssl rand -base64 32)
JWT_SECRET=

# Configuración de la app
VITE_APP_TITLE=Hostel & Tienda Management System
VITE_APP_LOGO=

# APIs de Manus (opcional - para OCR, Storage, etc.)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=

# OAuth Manus (opcional)
VITE_APP_ID=
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=

# Propietario
OWNER_OPEN_ID=
OWNER_NAME=
EOF

# Crear archivo de instrucciones rápidas
cat > $DEPLOY_DIR/INSTRUCCIONES_RAPIDAS.txt << 'EOF'
╔════════════════════════════════════════════════════════════════╗
║  INSTRUCCIONES RÁPIDAS - DESPLIEGUE EN PLESK                  ║
╚════════════════════════════════════════════════════════════════╝

1. CREAR SUBDOMINIO EN PLESK
   - management.thespotcentralhostel.com
   - Activar Node.js (versión 18+)
   - Activar SSL con Let's Encrypt

2. CREAR BASE DE DATOS
   - Nombre: hostel_management
   - Usuario: hostel_admin
   - Anotar la contraseña

3. SUBIR ARCHIVOS
   - Subir TODO el contenido de esta carpeta a /httpdocs/
   - Via SFTP, File Manager de Plesk, o Git

4. INSTALAR DEPENDENCIAS EN EL SERVIDOR
   cd /var/www/vhosts/.../httpdocs/
   pnpm install --production

5. CONFIGURAR VARIABLES DE ENTORNO
   - Copiar .env.example a .env
   - Rellenar con tus datos (ver ENV_VARIABLES.md)
   - O configurar en Plesk: Node.js > Environment Variables

6. EJECUTAR MIGRACIONES
   pnpm db:push

7. INSERTAR NEGOCIOS INICIALES (IMPORTANTE)
   pnpm tsx seed-businesses.mjs
   (Esto crea los negocios "Hostel" y "Tienda")

8. INICIAR LA APLICACIÓN
   Opción A (Plesk):
   - Node.js > Application startup file: dist/server/index.js
   - Click en "Enable Node.js" y "Restart"
   
   Opción B (PM2):
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup

9. VERIFICAR
   - Visita: https://management.thespotcentralhostel.com
   - Login con tus credenciales

═══════════════════════════════════════════════════════════════

📖 Documentación completa: DEPLOY_PLESK.md
🔧 Variables de entorno: ENV_VARIABLES.md

EOF

# Paso 5: Crear archivo ZIP
echo -e "${BLUE}[5/6]${NC} Creando archivo ZIP..."
cd $DEPLOY_DIR
zip -r ../hostel-management-deploy.zip . > /dev/null
cd ..

# Paso 6: Mostrar resumen
echo ""
echo -e "${GREEN}✅ ¡Paquete de despliegue creado exitosamente!${NC}"
echo ""
echo "📦 Archivos preparados en: ./$DEPLOY_DIR/"
echo "📦 Archivo ZIP: ./hostel-management-deploy.zip"
echo ""
echo -e "${YELLOW}Contenido del paquete:${NC}"
echo "  ✓ dist/client/          - Frontend compilado"
echo "  ✓ dist/server/          - Backend compilado"
echo "  ✓ drizzle/              - Migraciones de BD"
echo "  ✓ package.json          - Dependencias"
echo "  ✓ seed-businesses.mjs   - Script de seed de negocios"
echo "  ✓ ecosystem.config.js   - Configuración PM2"
echo "  ✓ .env.example          - Plantilla de variables"
echo "  ✓ DEPLOY_PLESK.md       - Guía completa"
echo "  ✓ ENV_VARIABLES.md      - Documentación de variables"
echo "  ✓ INSTRUCCIONES_RAPIDAS.txt - Pasos rápidos"
echo ""
echo -e "${YELLOW}Tamaño del paquete:${NC}"
du -sh $DEPLOY_DIR
du -sh hostel-management-deploy.zip
echo ""
echo -e "${GREEN}Próximos pasos:${NC}"
echo "  1. Descarga el archivo: hostel-management-deploy.zip"
echo "  2. Descomprímelo en tu máquina"
echo "  3. Lee INSTRUCCIONES_RAPIDAS.txt"
echo "  4. Sube los archivos a tu servidor Plesk"
echo ""
echo -e "${BLUE}¡Listo para desplegar! 🚀${NC}"
