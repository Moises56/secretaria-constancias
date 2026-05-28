import "server-only";

export interface RateLimitResult {
  /** True si la solicitud está dentro del límite. */
  allowed: boolean;
  /** Cantidad de intentos registrados en la ventana actual. */
  count: number;
  /** Cantidad máxima permitida antes de bloquear. */
  limit: number;
  /** Milisegundos restantes hasta que la ventana se resetee. */
  retryAfterMs: number;
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
  /** Borra el contador (ej. tras login exitoso). */
  reset(key: string): Promise<void>;
}

interface Entry {
  count: number;
  /** Epoch ms en el que expira la ventana. */
  expiresAt: number;
}

/**
 * Limiter en memoria para un solo proceso. NO sirve en serverless ni en
 * multi-instance — TODO: reemplazar con Upstash Redis antes de despliegue
 * en producción multi-instancia.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly store = new Map<string, Entry>();
  // Barrido amortizado: cada 1024 escrituras limpiamos entradas expiradas.
  // Evita que el Map crezca monotónicamente con IPs únicas (cada IP que llegue
  // una sola vez deja una Entry hasta que se reuse la misma key, lo cual nunca
  // pasa con tráfico real). NO usamos setInterval para no mantener el event
  // loop vivo en flows de tear-down (tests).
  private writeCount = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();

    if ((++this.writeCount & 1023) === 0) {
      for (const [k, v] of this.store) {
        if (v.expiresAt <= now) this.store.delete(k);
      }
    }

    const existing = this.store.get(key);

    if (!existing || existing.expiresAt <= now) {
      // Nueva ventana
      this.store.set(key, { count: 1, expiresAt: now + this.windowMs });
      return {
        allowed: true,
        count: 1,
        limit: this.limit,
        retryAfterMs: this.windowMs,
      };
    }

    existing.count += 1;
    const allowed = existing.count <= this.limit;
    return {
      allowed,
      count: existing.count,
      limit: this.limit,
      retryAfterMs: Math.max(0, existing.expiresAt - now),
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Login: 5 intentos / 15 min por IP. Al 6to bloquea.
// Verify (/v/*): 30 req / min por IP — mitiga enumeration y bot scraping.
//
// Cada dominio tiene su PROPIA instancia de limiter para que no compartan
// contador. Si en el futuro se mueven a Redis, mantener el namespace por
// prefijo en la key.
// ─────────────────────────────────────────────────────────────────────────

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

const VERIFY_WINDOW_MS = 60 * 1000;
const VERIFY_MAX_ATTEMPTS = 30;

// Export CSV: 10 por minuto POR USUARIO (no por IP). Sin esto, un admin
// autenticado podría exfiltrar/generar carga descomunal exportando en bucle.
const EXPORT_WINDOW_MS = 60 * 1000;
const EXPORT_MAX_ATTEMPTS = 10;

// Los singletons viven en `globalThis` para sobrevivir a HMR en dev
// (mismo patrón que PrismaClient).
const globalForLimiter = globalThis as unknown as {
  __loginRateLimiter?: InMemoryRateLimiter;
  __verifyRateLimiter?: InMemoryRateLimiter;
  __exportRateLimiter?: InMemoryRateLimiter;
};

export const loginRateLimiter: RateLimiter =
  globalForLimiter.__loginRateLimiter ??
  new InMemoryRateLimiter(LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);

export const verifyRateLimiter: RateLimiter =
  globalForLimiter.__verifyRateLimiter ??
  new InMemoryRateLimiter(VERIFY_MAX_ATTEMPTS, VERIFY_WINDOW_MS);

export const exportRateLimiter: RateLimiter =
  globalForLimiter.__exportRateLimiter ??
  new InMemoryRateLimiter(EXPORT_MAX_ATTEMPTS, EXPORT_WINDOW_MS);

if (process.env.NODE_ENV !== "production") {
  globalForLimiter.__loginRateLimiter = loginRateLimiter as InMemoryRateLimiter;
  globalForLimiter.__verifyRateLimiter = verifyRateLimiter as InMemoryRateLimiter;
  globalForLimiter.__exportRateLimiter = exportRateLimiter as InMemoryRateLimiter;
}

/**
 * Chequea el rate limit para la página pública de verificación. Devuelve
 * `blocked: true` si la IP ya excedió la ventana de 30 req/min.
 */
export async function checkVerifyRateLimit(
  ipAddress: string,
): Promise<{ blocked: boolean; retryAfterMs: number }> {
  const result = await verifyRateLimiter.check(`verify:${ipAddress}`);
  return { blocked: !result.allowed, retryAfterMs: result.retryAfterMs };
}

/**
 * Rate limit de exports CSV, keyed POR USUARIO autenticado (no IP). Lo usan
 * `/api/constancias/export` y `/api/audit/export` → 429 si `blocked`.
 */
export async function checkExportRateLimit(
  userId: string,
): Promise<{ blocked: boolean; retryAfterMs: number }> {
  const result = await exportRateLimiter.check(`export:${userId}`);
  return { blocked: !result.allowed, retryAfterMs: result.retryAfterMs };
}

export const RATE_LIMIT_CONFIG = {
  LOGIN_WINDOW_MS,
  LOGIN_MAX_ATTEMPTS,
  VERIFY_WINDOW_MS,
  VERIFY_MAX_ATTEMPTS,
  EXPORT_WINDOW_MS,
  EXPORT_MAX_ATTEMPTS,
} as const;
