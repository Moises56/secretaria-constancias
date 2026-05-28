import { prisma } from "@/server/db";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint de health para monitoreo del proxy/PM2 (FASE 12). Verifica
 * que la app está viva Y que el adaptador de Prisma puede llegar a la
 * BD con un `SELECT 1`. Devuelve 200 con `{ status: "ok" }` o 503 con
 * `{ status: "degraded", error: "db_unreachable" }`.
 *
 * NO requiere autenticación — debe responder igual a un curl del proxy.
 * El matcher de `proxy.ts` lo excluye explícitamente para que no pase
 * por el check de sesión.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "health: db unreachable");
    return Response.json(
      { status: "degraded", error: "db_unreachable" },
      { status: 503 },
    );
  }
}
