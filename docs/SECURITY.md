# Threat Model — Constancias AMDC

> Sistema de Constancias de Vecindad — Secretaría Municipal del Distrito Central.
> Última revisión: FASE 10 (hardening de seguridad).

## Amenazas cubiertas

| Amenaza                                      | Mitigación                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Fraude de constancia física                  | QR con token HMAC opaco (64 hex) + página `/v/[token]` con masking de DNI                                |
| Acceso no autorizado a `/admin/*`            | `proxy.ts` (redirect a `/`) + `requirePermission` en layout/page/action + `securityStamp`                |
| Brute force de login                         | Rate limit 5/15min por IP + AuditLog `LOGIN_BLOCKED`                                                     |
| Escalada de privilegios                      | AuditLog de cambios de rol con before/after; `securityStamp` invalida la sesión del afectado             |
| Exfiltración masiva de datos                 | Rate limit en exports (10/min/usuario, 429) + `AUDIT_EXPORTED` registrado ANTES de cerrar el stream      |
| Colisión de folio (race condition)           | Transacción `Serializable` + `withRetries` de `P2034`                                                    |
| XSS                                          | Escape por defecto de React + CSP estricta + CERO `dangerouslySetInnerHTML` + `sanitizeForPdf` en el PDF |
| Clickjacking                                 | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`                                                   |
| MIME sniffing                                | `X-Content-Type-Options: nosniff` global y en endpoints binarios                                         |
| CSRF en mutaciones                           | Server Actions (origin check de Next) + cookies `SameSite=Lax` + `form-action 'self'`                    |
| Enumeration vía `/v/`                        | Token opaco HMAC + rate limit 30/min por IP + auditoría de `NOT_FOUND`/`RATE_LIMITED`                    |
| Persistencia de sesión tras cambio crítico   | `securityStamp` en el JWT + verificación en cada `session` callback (cache 60s)                          |
| Filtración de password/token en logs         | `pino` con `redact` (password, passwordHash, token) + nunca en AuditLog metadata                         |
| Inyección de caracteres de control en el PDF | `sanitizeForPdf` elimina C0+DEL antes de `@react-pdf`                                                    |

## Amenazas NO cubiertas (v1)

| Amenaza                                   | Por qué no se cubre                     | Mitigación operacional                                     |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Phishing de credenciales                  | Sin 2FA todavía (v2)                    | Capacitación + correo institucional verificado             |
| Compromiso del servidor                   | Sin secrets management dedicado         | Acceso restringido a personal autorizado, `.env` protegido |
| DDoS                                      | Rate limit es in-memory, no distribuido | Reverse proxy (Caddy) + Cloudflare opcional                |
| SQL Injection                             | Prisma parametriza todo                 | N/A — mitigación estructural                               |
| Compromiso de un firmante legítimo        | Fuera de scope técnico                  | Revocación manual + reemisión                              |
| Falsificación física del papel membretado | Fuera de scope del software             | Control de inventario del `paperSerial`                    |

## Procedimientos en caso de incidente

1. **Compromiso de cuenta admin**: desde otra cuenta admin → desactivar la cuenta comprometida → resetear su password (ambas acciones bumpean `securityStamp` e invalidan su sesión) → revisar AuditLog de las últimas 48h.
2. **Sospecha de constancia fraudulenta**: ubicar por folio en `/constancias` → comparar el snapshot del firmante con el firmante actual → si difiere, revisar `SIGNER_UPDATED` en el periodo.
3. **Backup de auditoría**: `pg_dump` diario + export CSV semanal de AuditLog (`/api/audit/export`) para storage offline. Cada export queda registrado como `AUDIT_EXPORTED`.
4. **Restauración tras incidente**: ver `CLAUDE.md` "Seed inicial" — el seed re-sincroniza `FolioSequence` automáticamente. La suite E2E también lo hace en `tests/e2e/global-setup.ts`.

## Límites conocidos del sistema

- **Rate limiting in-memory NO sirve en multi-instancia** — antes de escalar a serverless/múltiples réplicas, migrar a Upstash Redis (manteniendo el namespace por prefijo en la key).
- Sesiones JWT no invalidables remotamente excepto vía `securityStamp` (cambio de rol, reset de password, desactivación), con hasta 60s de retardo por el cache.
- AuditLog crece sin límite — considerar rotación/archivado tras 12 meses.
- CSP con `'unsafe-inline'` en `script-src`/`style-src`: relajación estándar para Next sin nonce + Tailwind/CSS-in-JS (recharts/GSAP). `'unsafe-eval'` SOLO en dev (Turbopack HMR); el build de producción no lo incluye.
