import { describe, expect, it } from "vitest";

import { hasActiveAuditFilters, parseAuditListSearchParams } from "@/lib/validators/audit";

describe("parseAuditListSearchParams", () => {
  it("aplica defaults cuando no hay params", () => {
    const p = parseAuditListSearchParams({});
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(25);
    expect(p.action).toBeUndefined();
  });

  it("descarta una acción inválida pero conserva las válidas", () => {
    const p = parseAuditListSearchParams({ action: "NO_EXISTE", entity: "User" });
    expect(p.action).toBeUndefined();
    expect(p.entity).toBe("User");
  });

  it("aplana arrays tomando el primer valor", () => {
    const p = parseAuditListSearchParams({ action: ["LOGIN", "LOGOUT"] });
    expect(p.action).toBe("LOGIN");
  });

  it("coacciona page/pageSize y respeta límites", () => {
    const p = parseAuditListSearchParams({ page: "3", pageSize: "50" });
    expect(p.page).toBe(3);
    expect(p.pageSize).toBe(50);
    // pageSize fuera de rango cae al default
    const clamped = parseAuditListSearchParams({ pageSize: "5" });
    expect(clamped.pageSize).toBe(25);
  });

  it("valida formato de fecha YYYY-MM-DD", () => {
    expect(parseAuditListSearchParams({ from: "2026-01-01" }).from).toBe("2026-01-01");
    expect(parseAuditListSearchParams({ from: "01/01/2026" }).from).toBeUndefined();
  });

  it("descarta userId no-cuid", () => {
    expect(parseAuditListSearchParams({ userId: "garbage" }).userId).toBeUndefined();
  });
});

describe("hasActiveAuditFilters", () => {
  it("false sin filtros", () => {
    expect(hasActiveAuditFilters(parseAuditListSearchParams({}))).toBe(false);
  });
  it("true con un filtro presente", () => {
    expect(hasActiveAuditFilters(parseAuditListSearchParams({ action: "LOGIN" }))).toBe(true);
    expect(hasActiveAuditFilters(parseAuditListSearchParams({ entity: "Signer" }))).toBe(true);
  });
});
