import "server-only";

import { prisma } from "@/server/db";

interface CacheEntry {
  stamp: string;
  /** Epoch ms en el que la entrada expira y debe re-leerse de la BD. */
  expiresAt: number;
}

const TTL_MS = 60_000;

const globalForCache = globalThis as unknown as {
  __securityStampCache?: Map<string, CacheEntry>;
};

const cache: Map<string, CacheEntry> =
  globalForCache.__securityStampCache ?? new Map<string, CacheEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForCache.__securityStampCache = cache;
}

/**
 * Compara el securityStamp del JWT contra el de la BD.
 * Si difieren → ADMIN cambió el rol, reseteó la contraseña o desactivó al
 * usuario; la sesión debe invalidarse en el callback `session`.
 *
 * Para no leer la BD en CADA request, cacheamos el stamp por usuario 60s.
 * Esto significa que hasta 60s después de un cambio de seguridad el usuario
 * podría seguir activo — trade-off explícito documentado.
 */
export async function isSecurityStampValid(userId: string, tokenStamp: string): Promise<boolean> {
  const now = Date.now();
  const cached = cache.get(userId);

  if (cached && cached.expiresAt > now) {
    return cached.stamp === tokenStamp;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { securityStamp: true, isActive: true },
  });

  if (!user || !user.isActive) {
    cache.delete(userId);
    return false;
  }

  const stamp = user.securityStamp.toISOString();
  cache.set(userId, { stamp, expiresAt: now + TTL_MS });
  return stamp === tokenStamp;
}

export function invalidateSecurityStampCache(userId?: string) {
  if (userId === undefined) cache.clear();
  else cache.delete(userId);
}

/** Helpers de test — no usar en código de producción. */
export const __securityStampInternal = {
  cache,
  TTL_MS,
};
