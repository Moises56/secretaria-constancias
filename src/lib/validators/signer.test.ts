import { describe, expect, it } from "vitest";

import { signerCreateSchema, signerUpdateSchema } from "@/lib/validators/signer";

const ok = {
  fullName: "Diana Alejandra Cruz Rivera",
  titleLine: "Acuerdo de Delegación N.001 AMDC-SM-2026",
  defaultForTypes: ["CVD", "CVP"] as const,
};

describe("signerCreateSchema — fullName", () => {
  it("acepta tildes, apóstrofes y guiones", () => {
    expect(signerCreateSchema.safeParse({ ...ok, fullName: "José O'Connor-Núñez" }).success).toBe(
      true,
    );
  });
  it("rechaza dígitos en el nombre", () => {
    expect(signerCreateSchema.safeParse({ ...ok, fullName: "Diana 2 Cruz" }).success).toBe(false);
  });
  it("colapsa espacios múltiples", () => {
    const r = signerCreateSchema.safeParse({ ...ok, fullName: "  Diana   Cruz  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.fullName).toBe("Diana Cruz");
  });
});

describe("signerCreateSchema — titleLine", () => {
  it("acepta números y puntuación de cargo", () => {
    expect(signerCreateSchema.safeParse(ok).success).toBe(true);
  });
  it("rechaza símbolos no permitidos", () => {
    expect(signerCreateSchema.safeParse({ ...ok, titleLine: "Cargo @ raro #1" }).success).toBe(
      false,
    );
  });
});

describe("signerCreateSchema — defaultForTypes", () => {
  it("requiere al menos un tipo", () => {
    expect(signerCreateSchema.safeParse({ ...ok, defaultForTypes: [] }).success).toBe(false);
  });
  it("rechaza un tipo desconocido", () => {
    expect(signerCreateSchema.safeParse({ ...ok, defaultForTypes: ["XXX"] }).success).toBe(false);
  });
  it("deduplica tipos repetidos", () => {
    const r = signerCreateSchema.safeParse({ ...ok, defaultForTypes: ["CVE", "CVE", "CVD"] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.defaultForTypes).toEqual(["CVE", "CVD"]);
  });
  it("isActive default true cuando se omite", () => {
    const r = signerCreateSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isActive).toBe(true);
  });
});

describe("signerUpdateSchema", () => {
  it("requiere un id cuid válido", () => {
    expect(signerUpdateSchema.safeParse({ ...ok, id: "not-a-cuid", isActive: true }).success).toBe(
      false,
    );
  });
  it("acepta update completo válido", () => {
    const r = signerUpdateSchema.safeParse({
      ...ok,
      id: "ckabcd012345abcdef0123456",
      isActive: false,
    });
    expect(r.success).toBe(true);
  });
});
