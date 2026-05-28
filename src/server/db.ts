import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "@/env";

// Prisma 7 obliga a pasar un driver adapter al PrismaClient (la URL ya no se
// resuelve mágicamente desde DATABASE_URL del schema). Para Postgres usamos
// @prisma/adapter-pg envolviendo node-postgres.
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

  const enableQueryLog = process.env.PRISMA_LOG_QUERIES === "true";
  const log: ("query" | "error" | "warn")[] = enableQueryLog
    ? ["query", "error", "warn"]
    : ["error", "warn"];

  return new PrismaClient({ adapter, log });
}

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// En dev, Next reinicia el módulo en cada HMR; sin esto crearíamos un cliente
// nuevo por cada cambio y agotaríamos las conexiones del pool.
export const prisma: PrismaClientSingleton = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
