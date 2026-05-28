import { describe, expect, it } from "vitest";

import {
  AUDIT_ACTION_GROUPS,
  AUDIT_CATEGORY_BADGE,
  auditActionCategory,
  auditActionLabel,
} from "@/lib/audit-display";
import { AUDIT_ACTION_VALUES } from "@/lib/validators/audit";

describe("audit-display", () => {
  it("toda acción de AUDIT_ACTION_VALUES pertenece a exactamente un grupo", () => {
    const grouped = AUDIT_ACTION_GROUPS.flatMap((g) => g.actions);
    for (const action of AUDIT_ACTION_VALUES) {
      expect(grouped).toContain(action);
    }
    // sin duplicados entre grupos
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("toda acción tiene un label en español (distinto del código crudo)", () => {
    for (const action of AUDIT_ACTION_VALUES) {
      expect(auditActionLabel(action)).not.toBe(action);
      expect(auditActionLabel(action).length).toBeGreaterThan(0);
    }
  });

  it("auditActionCategory mapea cada acción a la categoría de su grupo", () => {
    for (const group of AUDIT_ACTION_GROUPS) {
      for (const action of group.actions) {
        expect(auditActionCategory(action)).toBe(group.category);
      }
    }
  });

  it("fallback para acción desconocida: categoría AUDIT y label = el código", () => {
    expect(auditActionCategory("ACCION_FUTURA")).toBe("AUDIT");
    expect(auditActionLabel("ACCION_FUTURA")).toBe("ACCION_FUTURA");
  });

  it("cada categoría usada tiene clases de badge definidas", () => {
    for (const group of AUDIT_ACTION_GROUPS) {
      expect(AUDIT_CATEGORY_BADGE[group.category]).toBeTruthy();
    }
  });
});
