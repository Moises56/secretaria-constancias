# Testing Strategy — Constancias AMDC

> Estado: **240 unit (Vitest)** · **69 E2E (Playwright/chromium)** · coverage de
> capas unit-testeables ~94%. Gate de CI obligatorio en cada PR.

## Pirámide de tests

```
        /\
       /  \   E2E (Playwright)        ~69 · flujos reales en navegador (auth, RBAC, UI+BD)
      /----\
     /      \ Integration (Vitest + DB real)   services con Prisma (folio, list, stats, audit)
    /--------\
   /          \ Unit (Vitest puro)   validators, utils, invariantes, audit helpers, lógica pura
  /------------\
```

## Reglas (qué tipo de test para qué)

### 1. Lógica PURA → unit test (sin mocks de infra)

Validators (Zod), formatters, invariantes puras, parsers, helpers de display.
Sin mocks de Prisma/Auth/Next. Rápidos (<100ms).
Ej.: `src/lib/validators/*.test.ts`, `src/server/lib/invariants.test.ts`,
`src/lib/audit-display.test.ts`, `src/lib/utils/format.test.ts`.

### 2. Lógica con metadata/forma → unit con spy liviano

Los helpers de `src/server/lib/audit.ts` se prueban mockeando solo
`@/server/db` (un spy sobre `auditLog.create`) y verificando action/entity/
metadata — **incluida la garantía de que NUNCA se loguea password/hash/token**.
Ej.: `src/server/lib/audit.test.ts`.

### 3. Lógica con BD → integration con DB real

Services que tocan Prisma directamente (folio, list, stats, audit-list). Usan
la BD de desarrollo. **Cualquier test que mute tablas compartidas DEBE
restaurar el estado** (ver "snapshot+restore"). Ej.:
`src/server/services/folio.service.test.ts` (snapshot+restore de FolioSequence).

### 4. Lógica que cruza auth + BD + UI → E2E con Playwright

Server Actions completos, flujos de usuario, RBAC, headers de seguridad. Login
real con cookies (no mocks). Verificar UI **y** BD post-acción. Ej.:
`tests/e2e/admin-usuarios.spec.ts`, `tests/e2e/security.spec.ts`.

## NO hacer

- ❌ Mockear Prisma/Auth.js en unit tests de **Server Actions** → mocks pesados
  y frágiles. Los actions se prueban vía E2E (happy path + branches de error
  reales: invariantes, último-admin, DomainError → toast).
- ❌ Testear Server Components con Testing Library → casi todo es async/server;
  E2E es mejor.
- ❌ Regression visual (screenshot diff) en v1.
- ❌ Agregar tests para subir coverage sin probar comportamiento real.

## Coverage

- **Alcance medido**: solo `src/server/**` y `src/lib/**` (capas
  unit-testeables). Componentes React, pages, route handlers, Server Actions y
  el wiring de Auth.js se **excluyen** de coverage (se prueban por E2E). Config
  en `vitest.config.ts`.
- **Thresholds AGREGADOS por capa** (no `perFile`): `src/server/**` y
  `src/lib/**` deben mantener ≥70% líneas/funciones/statements y ≥65% branches.
  Se usa agregado (no perFile) a propósito: evita forzar tests cosméticos en
  archivos triviales (errores de dominio, wrappers).
- Reporte HTML en `coverage/index.html`; en CI se sube como artifact.

## Snapshot + restore (tests que tocan dev DB)

Cualquier test de integración que mute tablas compartidas debe dejarlas como
las encontró:

- `folio.service.test.ts`: snapshot de `FolioSequence` en `beforeAll`, limpia
  por test, **restaura el snapshot exacto en `afterAll`**. (Antes dejaba la
  tabla vacía y rompía la creación de constancias en E2E/dev — lección
  aprendida.)
- `tests/e2e/global-setup.ts`: re-sincroniza `FolioSequence` con
  `MAX(folioNumber)` antes de la suite E2E (auto-sanación ante drift).

## Aislamiento de tests E2E

- Cada spec limpia sus datos en `afterAll` (entidades + sus `auditLog` por
  `entityId`/`userId`). Tags `e2e_*` (usuarios E2E) y `test_*` (seed dev)
  separan datos.
- **Rate limits son estado compartido por-usuario en el proceso del dev
  server.** Un test que agota una cuota (p.ej. el de 429 en exports) debe usar
  un usuario DEDICADO (un SECRETARY) para no contaminar la cuota del admin que
  otros specs usan. Lección: el test de export-429 usa `e2e_secretary`, no admin.
- `playwright.config.ts`: `fullyParallel: false` + `workers: 1` (los specs
  comparten usuarios E2E y la BD de dev). En CI no se sube a multi-worker por la
  misma razón.

## Tests flaky = bug

Cero tolerancia. Si un test es intermitente, se debuggea o se quita — un test
flaky es peor que no tenerlo. Verificación: correr la suite E2E 3× seguidas debe
dar 69/69 las tres veces. Causas típicas ya resueltas:

- Toggles de base-ui (Checkbox/Select): confirmar el cambio de estado
  (`toBeChecked`/`toHaveValue`) ANTES de enviar el form.
- `FolioSequence` drift → globalSetup + snapshot+restore.
- Cuotas de rate limit compartidas entre specs → usuario dedicado.

## CI/CD

`.github/workflows/ci.yml` corre en cada push a `main`/`develop` y en PRs a
`main`: instala deps, `prisma generate` + `migrate deploy` + `db:seed` contra un
Postgres de servicio, luego `typecheck` → `lint` → `test --coverage` → `build`
→ `test:e2e`. El threshold de coverage es gate obligatorio (el job falla si baja
de 70%). Artifacts: reporte de coverage siempre; report de Playwright si E2E
falla.

## Comandos

```bash
pnpm test                 # unit + integration (vitest run)
pnpm test --coverage      # + reporte de coverage (gate de threshold)
pnpm test:e2e             # Playwright (requiere DB up + chromium instalado)
pnpm test <patrón>        # ej. pnpm test folio
```
