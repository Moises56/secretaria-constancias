import { z } from "zod";

export const STATS_PRESETS = ["today", "7d", "30d", "90d", "ytd", "custom"] as const;
export type StatsPreset = (typeof STATS_PRESETS)[number];

export const PRESET_LABEL: Record<StatsPreset, string> = {
  today: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
  ytd: "Año actual",
  custom: "Personalizado",
};

export const statsRangeParamsSchema = z.object({
  preset: z.enum(STATS_PRESETS).default("30d"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional(),
});

export type StatsRangeParams = z.infer<typeof statsRangeParamsSchema>;

/**
 * Parser tolerante (mismo patrón que constancia-list.ts).
 */
export function parseStatsRangeParams(
  raw: Record<string, string | string[] | undefined>,
): StatsRangeParams {
  const normalized: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    const single = Array.isArray(v) ? v[0] : v;
    if (typeof single === "string" && single !== "") normalized[k] = single;
  }
  const direct = statsRangeParamsSchema.safeParse(normalized);
  if (direct.success) return direct.data;

  const rescued: Record<string, unknown> = {};
  const shape = statsRangeParamsSchema.shape;
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    const fieldSchema = shape[key];
    const value = normalized[key as string];
    if (value === undefined) continue;
    const parsed = fieldSchema.safeParse(value);
    if (parsed.success) rescued[key as string] = parsed.data;
  }
  return statsRangeParamsSchema.parse(rescued);
}

export interface ResolvedRange {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}

/** Inicio del día local (00:00:00.000). */
function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Fin del día local (23:59:59.999). */
function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

/** Suma N días a una fecha (puede ser negativo). */
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Resuelve un preset (o `custom`) a `{ from, to, previousFrom, previousTo }`.
 * El periodo previo siempre tiene la MISMA duración que el actual y queda
 * pegado inmediatamente antes (no es "mes anterior" calendárico).
 *
 * Cache-friendly: las fechas se normalizan a comienzo/fin de día local de
 * Tegucigalpa, por lo que llamadas dentro del mismo día con el mismo preset
 * producen exactamente los mismos timestamps.
 */
export function resolveStatsRange(params: StatsRangeParams, now: Date = new Date()): ResolvedRange {
  const today = startOfDay(now);

  // Helper: dado from/to válidos, construye el periodo previo de igual duración.
  function withPrevious(from: Date, to: Date): ResolvedRange {
    const durationMs = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - durationMs);
    return { from, to, previousFrom, previousTo };
  }

  switch (params.preset) {
    case "today": {
      const from = today;
      const to = endOfDay(now);
      return withPrevious(from, to);
    }
    case "7d":
    case "30d":
    case "90d": {
      const n = params.preset === "7d" ? 7 : params.preset === "30d" ? 30 : 90;
      const from = addDays(today, -(n - 1));
      const to = endOfDay(now);
      return withPrevious(from, to);
    }
    case "ytd": {
      const from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const to = endOfDay(now);
      return withPrevious(from, to);
    }
    case "custom": {
      if (params.from && params.to) {
        const from = startOfDay(new Date(`${params.from}T00:00:00`));
        const to = endOfDay(new Date(`${params.to}T00:00:00`));
        // Validar que la fecha sea parseable y from <= to; sino fallback 30d
        if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
          return withPrevious(from, to);
        }
      }
      // Fallback: mismo cálculo que "30d"
      return resolveStatsRange({ preset: "30d" }, now);
    }
  }
}
