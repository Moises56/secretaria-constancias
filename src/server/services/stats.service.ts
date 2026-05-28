import "server-only";

import { type ConstanciaType, type Role } from "@prisma/client";

import { prisma } from "@/server/db";

export interface DailySeriesPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface TopEmisor {
  userId: string;
  fullName: string;
  count: number;
}

export interface StatsResult {
  totalCurrent: number;
  totalPrevious: number;
  /** Cambio porcentual vs periodo previo. `null` si previo = 0. */
  pctChange: number | null;
  byType: Record<ConstanciaType, number>;
  annulled: number;
  series: DailySeriesPoint[];
  /** `null` cuando viewerRole ≠ ADMIN. `[]` cuando no hay datos. */
  topEmisores: TopEmisor[] | null;
}

interface StatsArgs {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  role: Role;
}

/**
 * Construye la serie temporal con TODOS los días del rango pre-poblados a 0.
 * Reducer en memoria: simple, suficiente hasta ~10k constancias.
 * TODO refactor: cuando el dataset crezca a 50k+, migrar a SQL `DATE_TRUNC`.
 */
async function computeDailySeries(from: Date, to: Date): Promise<DailySeriesPoint[]> {
  const all = await prisma.constancia.findMany({
    where: { issuedAt: { gte: from, lte: to }, status: "ACTIVE" },
    select: { issuedAt: true },
  });

  const buckets = new Map<string, number>();
  // Pre-poblar todos los días del rango con 0
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    buckets.set(toISODate(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const c of all) {
    const key = toISODate(c.issuedAt);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** YYYY-MM-DD en zona local del servidor (Tegucigalpa sin DST). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function computeTopEmisores(from: Date, to: Date): Promise<TopEmisor[]> {
  const grouped = await prisma.constancia.groupBy({
    by: ["issuedById"],
    where: { issuedAt: { gte: from, lte: to } },
    _count: { _all: true },
    orderBy: { _count: { issuedById: "desc" } },
    take: 5,
  });
  if (grouped.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.issuedById) } },
    select: { id: true, fullName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.fullName]));

  return grouped.map((g) => ({
    userId: g.issuedById,
    fullName: userMap.get(g.issuedById) ?? "Usuario desconocido",
    count: g._count._all,
  }));
}

async function computeStats(args: StatsArgs): Promise<StatsResult> {
  const { from, to, previousFrom, previousTo, role } = args;

  const [totalCurrent, totalPrevious, byTypeGrouped, annulled, series, topEmisores] =
    await Promise.all([
      prisma.constancia.count({
        where: { issuedAt: { gte: from, lte: to }, status: "ACTIVE" },
      }),
      prisma.constancia.count({
        where: { issuedAt: { gte: previousFrom, lte: previousTo }, status: "ACTIVE" },
      }),
      prisma.constancia.groupBy({
        by: ["type"],
        where: { issuedAt: { gte: from, lte: to }, status: "ACTIVE" },
        _count: { _all: true },
      }),
      prisma.constancia.count({
        where: { issuedAt: { gte: from, lte: to }, status: "ANNULLED" },
      }),
      computeDailySeries(from, to),
      role === "ADMIN" ? computeTopEmisores(from, to) : Promise.resolve(null),
    ]);

  const byType: Record<ConstanciaType, number> = { CVD: 0, CVP: 0, CVE: 0 };
  for (const row of byTypeGrouped) byType[row.type] = row._count._all;

  const pctChange =
    totalPrevious === 0 ? null : ((totalCurrent - totalPrevious) / totalPrevious) * 100;

  return {
    totalCurrent,
    totalPrevious,
    pctChange,
    byType,
    annulled,
    series,
    topEmisores,
  };
}

/**
 * Cómputo directo de stats en cada request (sin caché). El dataset es chico
 * en v1 (~6 queries paralelas, ~ms). La página `/` ya tiene
 * `dynamic = "force-dynamic"`, así que cada navegación dispara la query —
 * y los `revalidatePath("/")` desde las acciones aseguran datos frescos.
 *
 * Decisión técnica: NO usamos `unstable_cache` porque Next 16 cambió la
 * firma de `revalidateTag` y la invalidación por tag con la API legacy
 * deja de funcionar de forma fiable. Cuando `'use cache'` + `cacheTag`
 * se estabilicen (salgan del flag experimental), migrar a esa API.
 *
 * TODO: si la BD crece y la pantalla se siente lenta, considerar:
 * 1) `'use cache'` directives (Next 16 estable)
 * 2) SQL `DATE_TRUNC` para la serie diaria
 * 3) Materialized views en Postgres para los aggregates pesados
 */
export const getStats = computeStats;

/** Alias para tests (compat). */
export const __computeStatsUncached = computeStats;
