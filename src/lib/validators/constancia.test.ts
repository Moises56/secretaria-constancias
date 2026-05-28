import { describe, expect, it } from "vitest";

import { annulConstanciaSchema, constanciaCreateSchema } from "@/lib/validators/constancia";

const ok = {
  type: "CVP" as const,
  applicantFullName: "María Fernanda López Rodríguez",
  applicantIdNumber: "0801-1990-12345",
};

describe("constanciaCreateSchema — type", () => {
  it("acepta CVD, CVP, CVE", () => {
    for (const t of ["CVD", "CVP", "CVE"] as const) {
      expect(constanciaCreateSchema.safeParse({ ...ok, type: t }).success).toBe(true);
    }
  });
  it("rechaza un tipo desconocido", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, type: "OTRO" });
    expect(r.success).toBe(false);
  });
});

describe("constanciaCreateSchema — applicantFullName", () => {
  it("acepta tildes y ñ", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, applicantFullName: "José Ángel Núñez" });
    expect(r.success).toBe(true);
  });
  it("rechaza nombres con dígitos", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, applicantFullName: "Pedro 1990" });
    expect(r.success).toBe(false);
  });
  it("rechaza nombres con símbolos no permitidos", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, applicantFullName: "Juan @ Pérez" });
    expect(r.success).toBe(false);
  });
  it("colapsa espacios múltiples a uno", () => {
    const r = constanciaCreateSchema.safeParse({
      ...ok,
      applicantFullName: "  Juan   Carlos    Pérez  ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.applicantFullName).toBe("Juan Carlos Pérez");
  });
  it("rechaza nombre <5 caracteres tras trim", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, applicantFullName: " Jo " });
    expect(r.success).toBe(false);
  });
  it("rechaza nombre >150 caracteres", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, applicantFullName: "a".repeat(151) });
    expect(r.success).toBe(false);
  });
  it("acepta apóstrofes y guiones", () => {
    const r = constanciaCreateSchema.safeParse({
      ...ok,
      applicantFullName: "Juan O'Connor-García",
    });
    expect(r.success).toBe(true);
  });
});

describe("constanciaCreateSchema — applicantIdNumber", () => {
  it("acepta el formato hondureño con guiones", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, applicantIdNumber: "0801-1990-12345" });
    expect(r.success).toBe(true);
  });
  it("quita espacios internos antes de validar", () => {
    const r = constanciaCreateSchema.safeParse({
      ...ok,
      applicantIdNumber: " 0801 -1990 - 12345 ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.applicantIdNumber).toBe("0801-1990-12345");
  });
  it("rechaza DNI sin guiones", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, applicantIdNumber: "0801199012345" });
    expect(r.success).toBe(false);
  });
  it("rechaza grupos con dígitos faltantes", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, applicantIdNumber: "0801-199-12345" });
    expect(r.success).toBe(false);
  });
  it("rechaza letras dentro del DNI", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, applicantIdNumber: "0801-19A0-12345" });
    expect(r.success).toBe(false);
  });
});

describe("constanciaCreateSchema — paperSerial (opcional)", () => {
  it("ausente → success y queda undefined", () => {
    const r = constanciaCreateSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.paperSerial).toBeUndefined();
  });
  it("string vacío → undefined", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, paperSerial: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.paperSerial).toBeUndefined();
  });
  it("aplica uppercase y trim", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, paperSerial: "  sm-2348  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.paperSerial).toBe("SM-2348");
  });
  it("rechaza caracteres no permitidos (espacios internos, símbolos)", () => {
    expect(constanciaCreateSchema.safeParse({ ...ok, paperSerial: "SM 2348" }).success).toBe(false);
    expect(constanciaCreateSchema.safeParse({ ...ok, paperSerial: "SM@2348" }).success).toBe(false);
  });
  it("rechaza >30 caracteres", () => {
    const r = constanciaCreateSchema.safeParse({ ...ok, paperSerial: "A".repeat(31) });
    expect(r.success).toBe(false);
  });
});

describe("annulConstanciaSchema", () => {
  it("rechaza motivos con menos de 10 caracteres", () => {
    const r = annulConstanciaSchema.safeParse({ id: "ckabcd012345abcdef0123456", reason: "Corto" });
    expect(r.success).toBe(false);
  });
  it("rechaza id no-cuid", () => {
    const r = annulConstanciaSchema.safeParse({
      id: "not-a-cuid",
      reason: "Motivo suficientemente largo aquí",
    });
    expect(r.success).toBe(false);
  });
  it("acepta motivo válido y trimea", () => {
    const r = annulConstanciaSchema.safeParse({
      id: "ckabcd012345abcdef0123456",
      reason: "  Datos incorrectos del solicitante  ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.reason).toBe("Datos incorrectos del solicitante");
  });
});
