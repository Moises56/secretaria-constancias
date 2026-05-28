#!/bin/bash
# ============================================================
#  Deploy Constancias AMDC — comando único e idempotente (FASE 12)
#
#  Uso:
#    bash scripts/deploy.sh                  # deploy normal (preserva datos)
#    bash scripts/deploy.sh --first-deploy   # primer deploy (crea PG + seed)
#
#  Qué hace (en orden):
#    1. Verifica prereqs (.env.production existe)
#    2. Carga env
#    3. Crea el contenedor Postgres si no existe; lo arranca si está parado
#    4. Espera a que Postgres esté listo (pg_isready)
#    5. pnpm install --frozen-lockfile
#    6. prisma generate
#    7. prisma migrate deploy (idempotente)
#    8. db:seed SOLO con --first-deploy
#    9. pnpm build (webpack)
#   10. Crea logs/ si no existe
#   11. pm2 delete + pm2 start (recarga env frescas) + pm2 save
#   12. Health check vía curl
# ============================================================

set -euo pipefail

# --- Parámetros fijos confirmados contra el servidor amdc-gcc ---
PROJECT_DIR="/home/amdcadmin/AmdcFactProyect/Constancias"
PG_CONTAINER="secretaria-postgres"
PG_PORT="5438"
PM2_NAME="secretaria-constancias-3010"
APP_PORT="3010"

# --- Flag --first-deploy ---
FIRST_DEPLOY=false
for arg in "$@"; do
  if [ "$arg" = "--first-deploy" ]; then
    FIRST_DEPLOY=true
  fi
done

cd "$PROJECT_DIR"

if [ "$FIRST_DEPLOY" = true ]; then
  echo "🚀 Deploy Constancias AMDC (PRIMER DEPLOY — crea PG, hace seed)"
else
  echo "🚀 Deploy Constancias AMDC (preserva datos)"
fi

# --- 1. Prereqs ---
if [ ! -f .env.production ]; then
  echo "❌ Falta .env.production en $PROJECT_DIR"
  echo "   Copia .env.production.example y rellena los secretos con:"
  echo "     openssl rand -base64 32"
  exit 1
fi

# --- 2. Cargar env ---
set -a
# shellcheck disable=SC1091
source .env.production
set +a

# --- 3. Postgres en Docker (crear si no existe / arrancar si está parado) ---
if ! docker ps -a --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  echo "🐘 Creando contenedor Postgres ${PG_CONTAINER} en 127.0.0.1:${PG_PORT}..."
  docker run -d \
    --name "${PG_CONTAINER}" \
    --restart unless-stopped \
    -e POSTGRES_USER="${POSTGRES_USER}" \
    -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
    -e POSTGRES_DB="${POSTGRES_DB}" \
    -p "127.0.0.1:${PG_PORT}:5432" \
    -v secretaria_pgdata:/var/lib/postgresql/data \
    postgres:16-alpine
else
  echo "🐘 Contenedor ${PG_CONTAINER} ya existe."
  docker start "${PG_CONTAINER}" >/dev/null 2>&1 || true
fi

# --- 4. Esperar a Postgres ---
echo "⏳ Esperando a Postgres..."
for i in $(seq 1 30); do
  if docker exec "${PG_CONTAINER}" pg_isready -U "${POSTGRES_USER}" >/dev/null 2>&1; then
    echo "✅ Postgres listo."
    break
  fi
  if [ "$i" = "30" ]; then
    echo "❌ Postgres no respondió en 60s. Revisar: docker logs ${PG_CONTAINER}"
    exit 1
  fi
  sleep 2
done

# --- 5. Dependencias ---
echo "📦 pnpm install --frozen-lockfile..."
pnpm install --frozen-lockfile

# --- 6. Prisma generate ---
echo "🔧 prisma generate..."
pnpm prisma generate

# --- 7. Migraciones (idempotente — solo aplica las pendientes) ---
echo "🗄️  prisma migrate deploy..."
pnpm prisma migrate deploy

# --- 8. Seed SOLO primer deploy ---
if [ "$FIRST_DEPLOY" = true ]; then
  echo "🌱 Seed inicial (admin + firmantes + re-sync FolioSequence)..."
  pnpm db:seed
else
  echo "⏭️  Seed omitido (deploy normal, preserva datos)."
  echo "    Si tras este deploy crear constancias falla con UniqueConstraintViolation"
  echo "    en folio, correr manualmente: pnpm db:seed (es idempotente)."
fi

# --- 9. Build (webpack — Turbopack rompe en Cloudflare de AMDC) ---
echo "🏗️  Build con webpack..."
pnpm build

# --- 10. Logs dir ---
mkdir -p logs

# --- 11. PM2 (delete + start recarga las env vars frescas; restart no las relee) ---
echo "♻️  PM2..."
pm2 delete "${PM2_NAME}" >/dev/null 2>&1 || true
pm2 start ecosystem.config.js
pm2 save

# --- 12. Health check ---
echo "🩺 Verificando /api/health..."
sleep 3
HEALTHY=false
for i in $(seq 1 15); do
  if curl -fsS "http://localhost:${APP_PORT}/api/health" >/dev/null 2>&1; then
    echo "✅ App healthy en http://localhost:${APP_PORT}"
    HEALTHY=true
    break
  fi
  sleep 2
done
if [ "$HEALTHY" = false ]; then
  echo "⚠️  /api/health no respondió en 30s — revisar: pm2 logs ${PM2_NAME} --lines 50"
fi

echo ""
echo "✅ Deploy completo."
echo "   App:    https://secretaria.amdc.hn  (→ 192.168.200.82:${APP_PORT})"
echo "   Logs:   pm2 logs ${PM2_NAME} --lines 30"
echo "   Health: curl http://localhost:${APP_PORT}/api/health"
if [ "$FIRST_DEPLOY" = true ]; then
  echo ""
  echo "   ⚠️  PRIMER LOGIN: admin debe cambiar la contraseña en /admin/usuarios."
fi
