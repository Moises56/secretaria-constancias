import { describe, expect, it } from "vitest";

import { typesLosingActiveSigner, wouldRemoveLastAdmin } from "@/server/lib/invariants";

describe("typesLosingActiveSigner", () => {
  it("firmante ya inactivo no pone ningún tipo en riesgo", () => {
    expect(
      typesLosingActiveSigner({
        wasActive: false,
        currentTypes: ["CVD", "CVP"],
        willBeActive: true,
        nextTypes: ["CVD"],
      }),
    ).toEqual([]);
  });

  it("desactivar pierde TODOS los tipos actuales", () => {
    expect(
      typesLosingActiveSigner({
        wasActive: true,
        currentTypes: ["CVD", "CVP"],
        willBeActive: false,
        nextTypes: ["CVD", "CVP"],
      }),
    ).toEqual(["CVD", "CVP"]);
  });

  it("activo→activo pierde solo los tipos removidos", () => {
    expect(
      typesLosingActiveSigner({
        wasActive: true,
        currentTypes: ["CVD", "CVP", "CVE"],
        willBeActive: true,
        nextTypes: ["CVD"],
      }),
    ).toEqual(["CVP", "CVE"]);
  });

  it("agregar tipos no pone nada en riesgo", () => {
    expect(
      typesLosingActiveSigner({
        wasActive: true,
        currentTypes: ["CVD"],
        willBeActive: true,
        nextTypes: ["CVD", "CVP"],
      }),
    ).toEqual([]);
  });
});

describe("wouldRemoveLastAdmin", () => {
  it("desactivar al único admin activo → true", () => {
    expect(
      wouldRemoveLastAdmin({
        beforeRole: "ADMIN",
        beforeActive: true,
        afterRole: "ADMIN",
        afterActive: false,
        otherActiveAdmins: 0,
      }),
    ).toBe(true);
  });

  it("degradar rol del único admin → true", () => {
    expect(
      wouldRemoveLastAdmin({
        beforeRole: "ADMIN",
        beforeActive: true,
        afterRole: "SECRETARY",
        afterActive: true,
        otherActiveAdmins: 0,
      }),
    ).toBe(true);
  });

  it("hay otro admin activo → false", () => {
    expect(
      wouldRemoveLastAdmin({
        beforeRole: "ADMIN",
        beforeActive: true,
        afterRole: "ADMIN",
        afterActive: false,
        otherActiveAdmins: 1,
      }),
    ).toBe(false);
  });

  it("el target no era admin activo → false", () => {
    expect(
      wouldRemoveLastAdmin({
        beforeRole: "SECRETARY",
        beforeActive: true,
        afterRole: "SECRETARY",
        afterActive: false,
        otherActiveAdmins: 0,
      }),
    ).toBe(false);
  });

  it("sigue siendo admin activo (solo cambió email) → false", () => {
    expect(
      wouldRemoveLastAdmin({
        beforeRole: "ADMIN",
        beforeActive: true,
        afterRole: "ADMIN",
        afterActive: true,
        otherActiveAdmins: 0,
      }),
    ).toBe(false);
  });
});
