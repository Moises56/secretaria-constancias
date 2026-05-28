#!/bin/bash
# ============================================================
#  Backup Constancias AMDC — pg_dump diario (FASE 12)
#
#  Uso:
#    bash scripts/backup.sh
#
#  Cron sugerido (en docs/DEPLOY.md):
#    0 2 * * * cd /home/amdcadmin/AmdcFactProyect/Constancias \
#      && bash scripts/backup.sh >> logs/backup.log 2>&1
#
#  Restauración:
#    gunzip -c backups/secretaria_YYYYMMDD_HHMMSS.sql.gz | \
#      docker exec -i secretaria-postgres psql -U <user> -d <db>
# ============================================================

set -euo pipefail

# Resuelve raíz del proyecto independiente del cwd del cron.
cd "$(dirname "$0")/.."

if [ ! -f .env.production ]; then
  echo "[$(date)] ❌ Falta .env.production"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.production
set +a

PG_CONTAINER="secretaria-postgres"
BACKUP_DIR="./backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/secretaria_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Backup → ${BACKUP_FILE}"

# pg_dump dentro del contenedor; gzip en el host.
# --no-owner / --no-privileges para que el dump sea portable a otro PG
# con un usuario distinto al de origen (útil para clonar a staging).
docker exec -i "${PG_CONTAINER}" pg_dump \
  -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  --no-owner --no-privileges | gzip > "${BACKUP_FILE}"

# Verificar que el backup no quedó vacío (pg_dump puede no fallar si el
# stream se cae a mitad — gzip de 0 bytes es un síntoma).
if [ ! -s "${BACKUP_FILE}" ]; then
  echo "[$(date)] ❌ ERROR: backup quedó vacío"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date)] ✅ OK: ${SIZE}"

# Retención: borrar dumps más viejos que RETENTION_DAYS.
find "${BACKUP_DIR}" -name "secretaria_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date)] Backups actuales en ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}" | tail -n +2
