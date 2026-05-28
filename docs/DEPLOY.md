# Deploy — Constancias AMDC

> Servidor de producción: `amdc-gcc` (Ubuntu, IP interna `192.168.200.82`).
> Dominio público: `https://secretaria.amdc.hn` (TLS terminado en el servidor `proxyinverso` de AMDC, fuera de este repo).

## Topología

```
  Cliente HTTPS
     │
     ▼
proxyinverso  (nginx — config gestionada por infra AMDC)
  secretaria.amdc.hn  →  http://192.168.200.82:3010
  pasa X-Forwarded-Proto / X-Real-IP / X-Forwarded-For
     │
     ▼
amdc-gcc  192.168.200.82
  └─ PM2 (fork, 1 instancia)
       └─ secretaria-constancias-3010   →  :3010
  └─ Docker  secretaria-postgres  →  127.0.0.1:5438
```

**No hay nginx/Caddy en este repo.** El TLS y el routing público lo maneja el equipo de infraestructura de AMDC en el servidor `proxyinverso`. Este repo solo entrega una app HTTP en `:3010` y una BD Postgres en `:5438` ambas escuchando solo `localhost`.

## Prereqs del servidor (ya instalados)

- Node.js 20+
- pnpm 10+
- PM2 global (`npm i -g pm2`)
- Docker
- Acceso a `git pull` del repo

## Primer deploy (una sola vez)

```bash
cd /home/amdcadmin/AmdcFactProyect
git clone https://github.com/Moises56/secretaria-constancias.git Constancias
cd Constancias

# 1) Crear .env.production a partir del ejemplo y rellenar los secretos
cp .env.production.example .env.production
# Generar 3 secretos UNICOS:
openssl rand -base64 32   # → AUTH_SECRET
openssl rand -base64 32   # → VERIFICATION_HMAC_SECRET
openssl rand -base64 32   # → POSTGRES_PASSWORD (mismo valor en DATABASE_URL)
# Editar .env.production y reemplazar todos los ___GENERAR___.
# Asegurarse de:
#   AUTH_TRUST_HOST=true     ← OBLIGATORIO
#   AUTH_URL=https://secretaria.amdc.hn
#   APP_URL=https://secretaria.amdc.hn
#   DATABASE_URL=...@localhost:5438/...
#   SEED_ADMIN_PASSWORD=<temporal fuerte>

# 2) Lanzar el primer deploy (crea el contenedor PG, migra, seedea, build, PM2)
bash scripts/deploy.sh --first-deploy
```

El script tarda ~3 min. Al terminar deja la app corriendo en `:3010`. El admin inicial tiene la password temporal de `SEED_ADMIN_PASSWORD`; el primer login debe entrar a `/admin/usuarios` y cambiarla.

## Deploys subsiguientes (cada release)

```bash
cd /home/amdcadmin/AmdcFactProyect/Constancias
git fetch && git checkout <tag-o-commit>
bash scripts/deploy.sh
```

El script es idempotente y conserva los datos. Saltea el seed, aplica solo migraciones nuevas, rebuildea y rearranca PM2.

> **Importante**: si tras un deploy normal la creación de constancias falla con `UniqueConstraintViolation` en `folio`, el contador `FolioSequence` está desincronizado contra `MAX(folioNumber)`. Correr `pnpm db:seed` (es idempotente — resincroniza el contador y no toca el resto de los datos).

## Verificación post-deploy

```bash
# 1) Health: 200 ok
curl http://localhost:3010/api/health

# 2) Logs sin errores
pm2 logs secretaria-constancias-3010 --lines 30 --nostream

# 3) Login real en https://secretaria.amdc.hn — la sesión DEBE PERSISTIR
#    tras submit (si rebota a /login: AUTH_TRUST_HOST=true falta, o el
#    proxy no manda X-Forwarded-Proto: https).

# 4) DevTools → Application → Cookies:
#    Nombre: __Secure-auth.session-token   (con prefijo Secure)
#    Flags:  Secure ✓ HttpOnly ✓ SameSite=Lax ✓

# 5) AuditLog debe registrar la IP REAL del cliente, no 192.168.200.x.
#    Revisar /admin/auditoria tras hacer login desde un cliente externo.

# 6) Crear constancia → ver PDF → escanear QR con celular → confirma "auténtica"
#    → /constancias → anular → reescanear → "anulada".
```

## Backup automatizado

`scripts/backup.sh` corre `pg_dump` contra el contenedor, comprime con gzip y borra dumps con más de `BACKUP_RETENTION_DAYS` días (default 30).

```bash
# Test manual
bash scripts/backup.sh

# Cron diario a las 02:00
crontab -e
# Pegar:
0 2 * * * cd /home/amdcadmin/AmdcFactProyect/Constancias && bash scripts/backup.sh >> logs/backup.log 2>&1
```

### Restauración desde backup

```bash
# Listar disponibles
ls -lh /home/amdcadmin/AmdcFactProyect/Constancias/backups/

# Restaurar (CUIDADO: pisa los datos actuales)
gunzip -c backups/secretaria_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i secretaria-postgres psql -U secretaria_prod -d secretaria_prod
```

## Reverse proxy (gestionado por infra AMDC)

La config de `proxyinverso` para `secretaria.amdc.hn` debe:
- Forwardear a `http://192.168.200.82:3010`.
- Pasar `X-Forwarded-Proto: https`, `X-Real-IP <ip_cliente>`, `X-Forwarded-For <ip_cliente, hops>`.
- No reescribir el host (la app no lo usa para routing, pero algunos clientes sí).

Si infra AMDC cambia esto:
- **Falta `X-Forwarded-Proto`** → cookie sin flag `Secure`, login no persiste.
- **Falta `X-Forwarded-For`** → AuditLog registra `192.168.200.x` (la IP del proxy) y el rate-limit por IP queda global a todos los usuarios.

## Build con webpack

`pnpm build` usa `next build --webpack`. Razón: Turbopack causa bloqueos de Cloudflare en el entorno AMDC. `--webpack` es el escape hatch oficial de Next 16 (ver `node_modules/next/dist/docs/`). El comando `dev` mantiene Turbopack para HMR rápido.

**No mover a Turbopack para producción sin antes verificar que el entorno deja pasar el output.**

## PM2 (fork + 1 instancia — OBLIGATORIO)

```bash
pm2 status                                  # ver estado
pm2 logs secretaria-constancias-3010        # logs en vivo
pm2 logs secretaria-constancias-3010 --err  # solo errores
pm2 restart secretaria-constancias-3010     # reiniciar SIN recargar .env.production
pm2 delete secretaria-constancias-3010      # detener (el deploy hace delete+start para recargar env)
pm2 save                                    # persistir lista (sobrevive reboot)
pm2 startup                                 # configurar inicio en boot (una vez al instalar)
```

> **No cambiar a cluster mode**. El rate-limit (login/verify/export) vive en memoria de un solo proceso. Cluster daría a cada worker su propio contador y el límite global se rompería. Antes de subir `instances`, migrar el rate-limit a Redis (hay `siclopr_redis` en el servidor).

## Troubleshooting

| Síntoma | Causa probable | Acción |
|---|---|---|
| Login funciona pero rebota a `/login` | Falta `AUTH_TRUST_HOST=true` o el proxy no manda `X-Forwarded-Proto: https` | Verificar `.env.production` y la config del proxy |
| Cookie de sesión sin `Secure` | Igual que arriba — el server no se entera de que está sobre HTTPS | Igual que arriba |
| AuditLog muestra IP `192.168.200.x` para todos | El proxy no manda `X-Forwarded-For`/`X-Real-IP` | Pedir a infra AMDC que los pase |
| Rate-limit bloquea a todos los usuarios juntos | Mismo problema de IP — todos comparten la IP del proxy | Igual que arriba |
| `pnpm build` falla | Cambio de Next, plugin incompatible con webpack | Revisar el error; agregar bloque webpack + `turbopack: {}` vacío en `next.config.ts` si se requiere config específica |
| App no conecta a Postgres | `DATABASE_URL` apunta a `db:5432` (config de Docker compose) en vez de `localhost:5438` | Corregir `.env.production` |
| Puerto 3010 ocupado | Otro proceso o un PM2 fantasma | `lsof -i :3010` → `pm2 delete <name>` o `kill <pid>` |
| `/api/health` pide login | `/api/health` no está en el matcher excluido de `proxy.ts` | Verificar que `proxy.ts` config tiene `api/health` en el negative-lookahead del matcher |
| FolioSequence drift tras deploy | El seed inicial no corrió y los datos importados no tienen counter sincronizado | `pnpm db:seed` (idempotente) |
| Build OK pero la app crashea al iniciar | `env.ts` rechaza alguna var del schema | Revisar `pm2 logs` — el mensaje dice qué var falta o es inválida |
| `__Secure-auth.session-token` se setea pero no llega | El cliente accede por HTTP (no por el dominio público) — el prefijo `__Secure-` requiere HTTPS | Acceder por `https://secretaria.amdc.hn`, no por IP local |

## Rollback

No hay un comando dedicado — usar git + redeploy:

```bash
git fetch && git checkout <tag-previo>
bash scripts/deploy.sh
```

Si la migración pendiente cambió el schema (DROP/ALTER), el rollback puro a una versión vieja **fallará** al arrancar porque el código vieja no entiende el schema nuevo. En ese caso:
1. Restaurar el backup de antes del deploy malo (ver "Restauración").
2. `git checkout <tag-previo>`.
3. `bash scripts/deploy.sh` (sin `--first-deploy`).

Por eso `scripts/backup.sh` corre **antes** de cada release crítico, y por eso el cron diario es importante.
