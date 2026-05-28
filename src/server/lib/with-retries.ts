import "server-only";

import { Prisma } from "@prisma/client";

/**
 * Códigos/mensajes que Prisma 7 reporta para conflictos de serialización
 * y deadlocks bajo Serializable. Toda transacción Serializable debe
 * envolverse en este helper.
 */
const RETRYABLE_PRISMA_CODES = new Set(["P2034"]);
const RETRYABLE_MESSAGE_FRAGMENTS = ["write conflict", "deadlock", "could not serialize"];

export interface WithRetriesOptions {
  maxRetries?: number;
  /** Backoff base en ms; el delay real es `min(2^attempt, cap) + jitter`. */
  baseDelayMs?: number;
  /** Cap del backoff por intento. */
  maxDelayMs?: number;
}

export async function withRetries<T>(
  fn: () => Promise<T>,
  opts: WithRetriesOptions = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 40;
  const baseDelay = opts.baseDelayMs ?? 10;
  const maxDelay = opts.maxDelayMs ?? 60;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const isKnown = err instanceof Prisma.PrismaClientKnownRequestError;
      const code = isKnown ? err.code : undefined;
      const msg = (err as Error).message ?? "";
      const isRetryable =
        (code !== undefined && RETRYABLE_PRISMA_CODES.has(code)) ||
        RETRYABLE_MESSAGE_FRAGMENTS.some((f) => msg.includes(f));

      attempt += 1;
      if (!isRetryable || attempt >= maxRetries) throw err;

      const exp = Math.min(2 ** attempt, maxDelay);
      const delay = exp + Math.random() * baseDelay * 4;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
