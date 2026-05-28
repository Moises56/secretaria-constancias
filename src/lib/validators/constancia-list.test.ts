import { describe, expect, it } from "vitest";

import {
  hasActiveFilters,
  parseConstanciaListSearchParams,
} from "@/lib/validators/constancia-list";

describe("parseConstanciaListSearchParams", () => {
  it("sin params devuelve defaults", () => {
    const r = parseConstanciaListSearchParams({});
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(25);
    expect(r.sort).toBe("issuedAt");
    expect(r.dir).toBe("desc");
    expect(r.q).toBeUndefined();
    expect(r.type).toBeUndefined();
  });

  it("trimea q y respeta max 100 (cae a undefined si excede)", () => {
    const r = parseConstanciaListSearchParams({ q: "  hola  " });
    expect(r.q).toBe("hola");

    const long = parseConstanciaListSearchParams({ q: "a".repeat(150) });
    expect(long.q).toBeUndefined();
  });

  it("type inválido cae a undefined sin lanzar", () => {
    const r = parseConstanciaListSearchParams({ type: "OTRO" });
    expect(r.type).toBeUndefined();
  });

  it("acepta type CVD/CVP/CVE", () => {
    for (const t of ["CVD", "CVP", "CVE"] as const) {
      expect(parseConstanciaListSearchParams({ type: t }).type).toBe(t);
    }
  });

  it("status válido pasa; inválido cae", () => {
    expect(parseConstanciaListSearchParams({ status: "ACTIVE" }).status).toBe("ACTIVE");
    expect(parseConstanciaListSearchParams({ status: "ANNULLED" }).status).toBe("ANNULLED");
    expect(parseConstanciaListSearchParams({ status: "WHATEVER" }).status).toBeUndefined();
  });

  it("from/to válidos pasan, inválidos caen", () => {
    expect(parseConstanciaListSearchParams({ from: "2026-05-01" }).from).toBe("2026-05-01");
    expect(parseConstanciaListSearchParams({ from: "01/05/2026" }).from).toBeUndefined();
    expect(parseConstanciaListSearchParams({ to: "2026-13-32" }).to).toBe("2026-13-32"); // regex matches; service hará new Date()
  });

  it("page y pageSize se coercionan desde string", () => {
    const r = parseConstanciaListSearchParams({ page: "3", pageSize: "50" });
    expect(r.page).toBe(3);
    expect(r.pageSize).toBe(50);
  });

  it("page <1 o no numérico cae al default 1", () => {
    expect(parseConstanciaListSearchParams({ page: "0" }).page).toBe(1);
    expect(parseConstanciaListSearchParams({ page: "-5" }).page).toBe(1);
    expect(parseConstanciaListSearchParams({ page: "abc" }).page).toBe(1);
  });

  it("pageSize >100 cae al default 25 (field-by-field rescue)", () => {
    expect(parseConstanciaListSearchParams({ pageSize: "999" }).pageSize).toBe(25);
    expect(parseConstanciaListSearchParams({ pageSize: "5" }).pageSize).toBe(25);
  });

  it("sort y dir validan enum", () => {
    const r = parseConstanciaListSearchParams({ sort: "folio", dir: "asc" });
    expect(r.sort).toBe("folio");
    expect(r.dir).toBe("asc");

    const bad = parseConstanciaListSearchParams({ sort: "random", dir: "lateral" });
    expect(bad.sort).toBe("issuedAt");
    expect(bad.dir).toBe("desc");
  });

  it("params adicionales se ignoran", () => {
    const r = parseConstanciaListSearchParams({ random: "xx", q: "hola" });
    expect(r.q).toBe("hola");
  });

  it("arrays (param duplicado) usa el primer valor", () => {
    const r = parseConstanciaListSearchParams({ type: ["CVD", "CVE"] });
    expect(r.type).toBe("CVD");
  });

  it("strings vacíos se tratan como undefined", () => {
    const r = parseConstanciaListSearchParams({ q: "", type: "" });
    expect(r.q).toBeUndefined();
    expect(r.type).toBeUndefined();
  });
});

describe("hasActiveFilters", () => {
  it("defaults → no hay filtros activos", () => {
    const p = parseConstanciaListSearchParams({});
    expect(hasActiveFilters(p)).toBe(false);
  });

  it("con q → activos", () => {
    const p = parseConstanciaListSearchParams({ q: "hola" });
    expect(hasActiveFilters(p)).toBe(true);
  });

  it("solo cambio de page NO cuenta como filtro activo", () => {
    const p = parseConstanciaListSearchParams({ page: "5" });
    expect(hasActiveFilters(p)).toBe(false);
  });

  it("sort distinto del default cuenta", () => {
    const p = parseConstanciaListSearchParams({ sort: "folio" });
    expect(hasActiveFilters(p)).toBe(true);
  });
});
