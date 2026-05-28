# Pre-Deploy Checklist — Constancias AMDC

> Lista a tildar antes de correr `bash scripts/deploy.sh` en producción.
> Runbook completo: [DEPLOY.md](./DEPLOY.md). Threat model: [SECURITY.md](./SECURITY.md).

## Antes de cada deploy

- [ ] CI verde en GitHub Actions (workflow `CI` sobre el commit a deployar).
- [ ] `pnpm build` (webpack) corre local sin errores.
- [ ] `pnpm test` y `pnpm test:e2e` verdes local.
- [ ] Tag de versión en git (`git tag vX.Y.Z`) ANTES del push al servidor.
- [ ] Backup de la BD actual hecho: `bash scripts/backup.sh` (revisar `backups/` para confirmar tamaño no vacío).
- [ ] Si hay migraciones nuevas: revisar `prisma/migrations/<nueva>/migration.sql` para verificar que no hace `DROP COLUMN`/`DROP TABLE` sobre datos que no se quieren perder.

## Primer deploy (una sola vez)

- [ ] `.env.production` existe en el servidor, NO `.env.production.example`.
- [ ] Cada secreto fue generado con `openssl rand -base64 32` y es ÚNICO:
  - [ ] `AUTH_SECRET`
  - [ ] `VERIFICATION_HMAC_SECRET`
  - [ ] `POSTGRES_PASSWORD` (mismo valor en `DATABASE_URL`)
- [ ] `AUTH_TRUST_HOST=true` en `.env.production`.
- [ ] `AUTH_URL=https://secretaria.amdc.hn` (con HTTPS, no localhost).
- [ ] `APP_URL=https://secretaria.amdc.hn`.
- [ ] `DATABASE_URL` apunta a `localhost:5438` (no `db:5432`).
- [ ] `SEED_ADMIN_PASSWORD` es una contraseña fuerte temporal (el admin debe cambiarla en el primer login).
- [ ] Puerto `:3010` libre en el host (`lsof -i :3010` vacío).
- [ ] Puerto `:5438` libre (ocupados por otras apps: 5433, 5435, 5436, 5437).
- [ ] Reverse proxy AMDC (`proxyinverso`) configurado con `secretaria.amdc.hn → http://192.168.200.82:3010` y pasando `X-Forwarded-Proto`, `X-Real-IP`, `X-Forwarded-For` (coordinar con infra AMDC).
- [ ] Cron de backup configurado (ver [DEPLOY.md → Backup automatizado](./DEPLOY.md#backup-automatizado)).

## Post-deploy (en cada release)

- [ ] `curl http://localhost:3010/api/health` → `{"status":"ok",...}` con HTTP 200.
- [ ] `pm2 status` muestra `secretaria-constancias-3010` en `online`.
- [ ] `pm2 logs secretaria-constancias-3010 --lines 30 --nostream` sin errores rojos.
- [ ] Login real en `https://secretaria.amdc.hn` con la cuenta admin:
  - [ ] Tras submit, llega a `/` y NO rebota a `/login` (si rebota → falta `AUTH_TRUST_HOST=true` o el proxy no pasa `X-Forwarded-Proto`).
  - [ ] DevTools → Application → Cookies muestra `__Secure-auth.session-token` con `Secure ✓ HttpOnly ✓ SameSite=Lax`.
- [ ] Crear una constancia de prueba → ver el PDF generado → escanear el QR con un celular (Android y iOS):
  - [ ] La página `/v/<token>` carga sobre `https://secretaria.amdc.hn`.
  - [ ] Muestra "Constancia auténtica" con los datos correctos.
- [ ] Anular esa constancia → reescanear → muestra "Anulada" con motivo.
- [ ] Visitar `/admin/auditoria` y filtrar por `LOGIN`:
  - [ ] El registro del login admin muestra una IP REAL del cliente (NO `192.168.200.x`, que sería la del proxy).
- [ ] `pm2 save` ejecutado para que la app sobreviva un reboot del servidor.
- [ ] Backup manual de validación: `bash scripts/backup.sh` y verificar que aparece en `backups/`.

## Si algo falla

- Stop el deploy y revisar `pm2 logs secretaria-constancias-3010 --err`.
- Comparar contra la tabla de troubleshooting en [DEPLOY.md](./DEPLOY.md#troubleshooting).
- Si la migración rompió datos, restaurar el backup justo previo (ver [DEPLOY.md → Restauración](./DEPLOY.md#restauración-desde-backup)) y rollbackear el código.
- Avisar al equipo AMDC si el problema es del proxy (no de la app).
