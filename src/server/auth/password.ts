import "server-only";

import { hash, verify } from "@node-rs/argon2";

// argon2id en el sweet spot recomendado por OWASP 2024:
//   memoryCost = 19456 KiB (~19 MiB), timeCost = 2, parallelism = 1.
// Helper CANÓNICO de hashing. `prisma/seed.ts` mantiene su propia copia de
// estos params porque corre bajo `tsx` (sin alias `@/` y sin runtime RSC, donde
// `import "server-only"` lanzaría). Si cambias los params aquí, sincroniza el seed.
export const ARGON2 = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2);
}

export function verifyPassword(stored: string, plain: string): Promise<boolean> {
  return verify(stored, plain);
}
