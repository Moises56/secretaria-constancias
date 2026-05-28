# constancias-amdc

Sistema interno para la **Secretaría Municipal del Distrito Central (AMDC)** que emite **Constancias de Vecindad** sobre papel membretado preimpreso, con folios numerados, verificación pública por QR y trazabilidad completa.

> Tipos cubiertos en v1: **CVD** (residencia pasada), **CVP** (residencia vigente), **CVE** (uso en el extranjero). Plantilla parametrizada única — agregar tipos nuevos requiere migración mínima.

---

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions, Turbopack)
- **React 19** + **TypeScript** estricto
- **Tailwind v4** + **shadcn/ui** (base-nova)
- **PostgreSQL 16** + **Prisma 7**
- **Auth.js v5** (Credentials, cookies httpOnly — sin localStorage)
- **@react-pdf/renderer** + **qrcode**
- **Vitest** (unit/integration) + **Playwright** (E2E)
- **Pino** logging estructurado

---

## Setup paso a paso

### Requisitos

- Node.js **≥ 20** (recomendado 22)
- pnpm **≥ 10**
- Docker Desktop (para Postgres en desarrollo)

### 1) Clonar y entrar al proyecto

```bash
git clone <repo-url>
cd constancias-amdc
```

### 2) Variables de entorno

```bash
cp .env.example .env
```

Genera secretos fuertes (32+ bytes base64) y reemplaza los valores `replace-me-*`:

```bash
# PowerShell (Windows)
[Convert]::ToBase64String((1..32 | %{ [byte](Get-Random -Min 0 -Max 256) }))

# bash / git-bash / WSL
openssl rand -base64 32
```

Variables relevantes (todas validadas con Zod en `src/env.ts`):

| Variable                   | Para qué sirve                                           |
| -------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`             | Connection string a Postgres                             |
| `AUTH_SECRET`              | Firma JWT de Auth.js                                     |
| `AUTH_URL`                 | URL canónica para callbacks de NextAuth                  |
| `VERIFICATION_HMAC_SECRET` | Firma de tokens HMAC del QR de verificación              |
| `APP_URL`                  | URL pública (entra al QR code)                           |
| `PDF_*_MARGIN_INCHES`      | Calibración del PDF contra el papel membretado físico    |
| `SEED_ADMIN_*`             | Credenciales del admin inicial creado por `pnpm db:seed` |

### 3) Levantar Postgres

```bash
pnpm db:up
```

Esto levanta el servicio `db` (postgres:16-alpine) en `localhost:5432` con volumen persistente `constancias_db_data`.

Comandos asociados:

```bash
pnpm db:down     # detener
pnpm db:logs     # tail de logs
```

### 4) Instalar dependencias

```bash
pnpm install
```

### 5) Migraciones y seed (después de FASE 2)

```bash
pnpm db:generate         # genera el Prisma Client
pnpm db:migrate          # crea/aplica migraciones en dev
pnpm db:seed             # admin inicial + firmantes
```

### 6) Levantar el dev server

```bash
pnpm dev
```

Abre <http://localhost:3000>.

---

## Desarrollo

### Credenciales de prueba (solo cuando `NODE_ENV !== "production"`)

`pnpm db:seed` crea, además del admin, dos usuarios de prueba para validar
manualmente los flujos de SECRETARY y VIEWER sin tener que crear cuentas a
mano desde Prisma Studio. Todos comparten la misma password.

| Usuario          | Rol       | Password                         | Para qué                                                        |
| ---------------- | --------- | -------------------------------- | --------------------------------------------------------------- |
| `admin`          | ADMIN     | `SEED_ADMIN_PASSWORD` del `.env` | Acceso completo. Cambiar antes de producción.                   |
| `test_secretary` | SECRETARY | `DevTest!2026`                   | Probar el flujo de creación de constancias y vista del listado. |
| `test_viewer`    | VIEWER    | `DevTest!2026`                   | Probar que solo ve (sin acciones de crear/anular).              |

> ⚠ El bloque que crea `test_secretary` y `test_viewer` se salta en
> producción (`NODE_ENV === "production"`). Si necesitas estos usuarios en
> un entorno productivo (no recomendado), créalos manualmente con una
> password fuerte propia.

Los E2E de Playwright NO usan estos usuarios — tienen sus propios seeds
tagged `e2e_*` (ver `tests/e2e/helpers/db.ts`).

---

## Scripts disponibles

| Script              | Qué hace                             |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | Servidor de desarrollo con Turbopack |
| `pnpm build`        | Build de producción                  |
| `pnpm start`        | Sirve el build de producción         |
| `pnpm lint`         | ESLint                               |
| `pnpm typecheck`    | `tsc --noEmit` (config estricta)     |
| `pnpm format`       | Prettier con plugin tailwind         |
| `pnpm format:check` | Verifica formato sin escribir        |
| `pnpm test`         | Vitest run                           |
| `pnpm test:watch`   | Vitest watch                         |
| `pnpm test:e2e`     | Playwright                           |
| `pnpm db:up`        | Postgres en Docker                   |
| `pnpm db:down`      | Detiene Postgres                     |
| `pnpm db:migrate`   | `prisma migrate dev`                 |
| `pnpm db:seed`      | Ejecuta `prisma/seed.ts`             |
| `pnpm db:studio`    | Prisma Studio                        |

---

## Estructura del proyecto

```
src/
├── env.ts                          # validación de env con Zod
├── app/
│   ├── (auth)/login/               # rutas públicas con shell propio
│   ├── (dashboard)/                # área autenticada (constancias, admin)
│   ├── v/[token]/                  # verificación pública del QR (sin auth)
│   └── api/                        # route handlers (auth, pdf, export, health)
├── components/
│   ├── ui/                         # shadcn/ui (base-nova)
│   ├── forms/                      # formularios de dominio
│   ├── layout/                     # AppShell, sidebar, header, theme toggle
│   └── charts/                     # recharts wrappers
├── lib/
│   ├── validators/                 # schemas Zod compartidos cliente/servidor
│   └── utils/                      # helpers puros (cn, format, mask-id)
├── server/                         # ⛔ server-only
│   ├── db.ts                       # PrismaClient singleton
│   ├── auth/                       # config NextAuth, permissions, require
│   ├── lib/                        # rate-limit, logger
│   ├── services/                   # folio, qr, pdf, date-words, stats
│   ├── templates/                  # renderConstanciaText (3 tipos)
│   └── actions/                    # Server Actions tipadas
└── types/
```

**Regla de imports:** `src/server/**` jamás se importa desde `src/components/**`. La frontera vive en Server Components y Server Actions.

---

## Operación

### Calibración del PDF sobre papel membretado

1. Imprime 1 constancia en papel blanco normal con los márgenes default (ver `.env.example`).
2. Sobreponla contra el papel membretado con luz de fondo.
3. Verifica que:
   - El texto no choque con el escudo superior
   - El QR no toque el sello inferior izquierdo (AMDC)
   - El texto no toque el borde lateral azul/amarillo derecho
   - Quede separación cómoda con el pie de redes sociales
4. Ajusta `PDF_*_MARGIN_INCHES` en `.env`, reinicia dev, reimprime.
5. **Documenta los valores definitivos** en este README (sección abajo) tras la primera calibración real.

> _Valores calibrados de producción:_ pendientes de primera impresión.

### Backups (post-deploy)

- `pg_dump` diario via cron contenedor.
- Retención: 30 días local + offsite semanal.
- Verificar `pg_restore` al menos 1 vez al mes.

---

## Documentación de dominio

- `docs/plan-constancias-v2.md` — plan maestro del sistema (12 fases).
- `docs/solicitud.md` — requerimiento original.
- `doscs-constancias/` — documentos de referencia (.docx) y formato del membrete (.jpg).
