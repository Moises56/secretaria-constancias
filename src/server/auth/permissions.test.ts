// @vitest-environment node
import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { can, PERMISSIONS, type Permission } from "@/server/auth/permissions";

const ALL_ROLES: Role[] = [Role.ADMIN, Role.SECRETARY, Role.VIEWER];
const ALL_PERMS = Object.keys(PERMISSIONS) as Permission[];

describe("permissions matrix", () => {
  it("no incluye SIGNER_OVERRIDE (decisión del usuario para v1)", () => {
    expect(ALL_PERMS).not.toContain("SIGNER_OVERRIDE" as Permission);
  });

  it("ADMIN tiene TODOS los permisos", () => {
    for (const p of ALL_PERMS) {
      expect(can(Role.ADMIN, p)).toBe(true);
    }
  });

  it("SECRETARY puede crear y ver, pero no anular ni administrar", () => {
    expect(can(Role.SECRETARY, "CONSTANCIA_CREATE")).toBe(true);
    expect(can(Role.SECRETARY, "CONSTANCIA_VIEW")).toBe(true);
    expect(can(Role.SECRETARY, "CONSTANCIA_ANNUL")).toBe(false);
    expect(can(Role.SECRETARY, "SIGNER_MANAGE")).toBe(false);
    expect(can(Role.SECRETARY, "USER_MANAGE")).toBe(false);
    expect(can(Role.SECRETARY, "AUDIT_VIEW")).toBe(false);
  });

  it("VIEWER solo puede ver constancias", () => {
    expect(can(Role.VIEWER, "CONSTANCIA_VIEW")).toBe(true);
    expect(can(Role.VIEWER, "CONSTANCIA_CREATE")).toBe(false);
    expect(can(Role.VIEWER, "CONSTANCIA_ANNUL")).toBe(false);
  });

  it("rol null o undefined nunca tiene permiso", () => {
    for (const p of ALL_PERMS) {
      expect(can(null, p)).toBe(false);
      expect(can(undefined, p)).toBe(false);
    }
  });

  it("cobertura completa: para cada (rol, perm) el resultado es booleano", () => {
    for (const r of ALL_ROLES) {
      for (const p of ALL_PERMS) {
        expect(typeof can(r, p)).toBe("boolean");
      }
    }
  });
});
