import { describe, expect, it } from "vitest";

import {
  parseStatsRangeParams,
  resolveStatsRange,
  statsRangeParamsSchema,
} from "@/lib/validators/stats-range";

// Fecha fija para tests determinísticos: viernes 22 de mayo de 2026 12:00 local.
const NOW = new Date(2026, 4, 22, 12, 0, 0, 0);

describe("parseStatsRangeParams", () => {
  it("sin params → preset='30d' por default", () => {
    expect(parseStatsRangeParams({}).preset).toBe("30d");
  });

  it("preset válido pasa", () => {
    expect(parseStatsRangeParams({ preset: "7d" }).preset).toBe("7d");
    expect(parseStatsRangeParams({ preset: "custom" }).preset).toBe("custom");
  });

  it("preset inválido cae al default", () => {
    expect(parseStatsRangeParams({ preset: "weird" }).preset).toBe("30d");
  });

  it("from/to válidos se conservan", () => {
    const r = parseStatsRangeParams({ from: "2026-01-01", to: "2026-05-22" });
    expect(r.from).toBe("2026-01-01");
    expect(r.to).toBe("2026-05-22");
  });

  it("from inválido cae a undefined", () => {
    const r = parseStatsRangeParams({ from: "01/05/2026" });
    expect(r.from).toBeUndefined();
  });
});

describe("resolveStatsRange", () => {
  it("preset='today' cubre hoy 00:00 → hoy 23:59:59.999", () => {
    const r = resolveStatsRange({ preset: "today" }, NOW);
    expect(r.from.getHours()).toBe(0);
    expect(r.from.getDate()).toBe(22);
    expect(r.to.getHours()).toBe(23);
    expect(r.to.getDate()).toBe(22);
  });

  it("preset='today' previo es ayer completo", () => {
    const r = resolveStatsRange({ preset: "today" }, NOW);
    expect(r.previousTo.getDate()).toBe(21);
    expect(r.previousFrom.getDate()).toBe(21);
    expect(r.previousFrom.getHours()).toBe(0);
  });

  it("preset='7d' cubre los últimos 7 días (incluyendo hoy)", () => {
    const r = resolveStatsRange({ preset: "7d" }, NOW);
    // from = hoy - 6 = 16 mayo
    expect(r.from.getDate()).toBe(16);
    expect(r.to.getDate()).toBe(22);
    // previo: 7 días pegados antes
    expect(r.previousTo.getDate()).toBe(15);
    expect(r.previousFrom.getDate()).toBe(9);
  });

  it("preset='30d' cubre los últimos 30 días", () => {
    const r = resolveStatsRange({ preset: "30d" }, NOW);
    expect(r.from.getDate()).toBe(23); // 22 - 29 días = 23 abril
    expect(r.from.getMonth()).toBe(3); // abril (índice 3)
    expect(r.to.getDate()).toBe(22);
    expect(r.to.getMonth()).toBe(4);
  });

  it("preset='ytd' cubre desde 1 enero del año actual", () => {
    const r = resolveStatsRange({ preset: "ytd" }, NOW);
    expect(r.from.getMonth()).toBe(0);
    expect(r.from.getDate()).toBe(1);
    expect(r.from.getFullYear()).toBe(2026);
  });

  it("previo siempre tiene MISMA duración que el actual", () => {
    for (const preset of ["today", "7d", "30d", "90d", "ytd"] as const) {
      const r = resolveStatsRange({ preset }, NOW);
      const currDur = r.to.getTime() - r.from.getTime();
      const prevDur = r.previousTo.getTime() - r.previousFrom.getTime();
      // Margen de 2ms (uno por boundary 23:59:59.999 vs 00:00:00.000)
      expect(Math.abs(currDur - prevDur)).toBeLessThan(2);
    }
  });

  it("preset='custom' con from/to válidos respeta el rango", () => {
    const r = resolveStatsRange({ preset: "custom", from: "2026-05-01", to: "2026-05-15" }, NOW);
    expect(r.from.getDate()).toBe(1);
    expect(r.from.getMonth()).toBe(4);
    expect(r.to.getDate()).toBe(15);
    expect(r.to.getMonth()).toBe(4);
  });

  it("preset='custom' sin from/to cae a 30d", () => {
    const custom = resolveStatsRange({ preset: "custom" }, NOW);
    const fallback = resolveStatsRange({ preset: "30d" }, NOW);
    expect(custom.from.getTime()).toBe(fallback.from.getTime());
    expect(custom.to.getTime()).toBe(fallback.to.getTime());
  });

  it("preset='custom' con from > to cae a 30d", () => {
    const r = resolveStatsRange({ preset: "custom", from: "2026-05-20", to: "2026-05-10" }, NOW);
    const fallback = resolveStatsRange({ preset: "30d" }, NOW);
    expect(r.from.getTime()).toBe(fallback.from.getTime());
  });
});

describe("schema básico", () => {
  it("acepta y normaliza", () => {
    expect(statsRangeParamsSchema.parse({}).preset).toBe("30d");
  });
});
