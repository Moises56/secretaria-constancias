// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildAuditListWhere } from "@/server/services/audit-list.service";

describe("buildAuditListWhere", () => {
  it("sin filtros → where vacío", () => {
    expect(buildAuditListWhere({})).toEqual({});
  });

  it("filtra por action", () => {
    expect(buildAuditListWhere({ action: "LOGIN" })).toEqual({ AND: [{ action: "LOGIN" }] });
  });

  it("combina userId y entity", () => {
    expect(buildAuditListWhere({ userId: "u1", entity: "User" })).toEqual({
      AND: [{ userId: "u1" }, { entity: "User" }],
    });
  });

  it("rango de fechas: 'to' inclusivo hasta fin del día", () => {
    expect(buildAuditListWhere({ from: "2026-01-01", to: "2026-01-31" })).toEqual({
      AND: [
        {
          createdAt: {
            gte: new Date("2026-01-01T00:00:00"),
            lte: new Date("2026-01-31T23:59:59.999"),
          },
        },
      ],
    });
  });

  it("solo 'from' deja lte indefinido", () => {
    expect(buildAuditListWhere({ from: "2026-05-01" })).toEqual({
      AND: [{ createdAt: { gte: new Date("2026-05-01T00:00:00") } }],
    });
  });
});
