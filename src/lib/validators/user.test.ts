import { describe, expect, it } from "vitest";

import { passwordResetSchema, userCreateSchema, userUpdateSchema } from "@/lib/validators/user";

const ok = {
  username: "secretaria1",
  email: "sec@amdc.gob.hn",
  fullName: "María Fernanda López",
  role: "SECRETARY" as const,
  password: "Abcdef1234!x",
};

describe("userCreateSchema — username", () => {
  it("normaliza a minúsculas ANTES de validar el regex", () => {
    const r = userCreateSchema.safeParse({ ...ok, username: "Secretaria_1" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.username).toBe("secretaria_1");
  });
  it("rechaza caracteres fuera de [a-z0-9_]", () => {
    expect(userCreateSchema.safeParse({ ...ok, username: "user.name" }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...ok, username: "user-name" }).success).toBe(false);
  });
  it("rechaza <3 o >30 caracteres", () => {
    expect(userCreateSchema.safeParse({ ...ok, username: "ab" }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...ok, username: "a".repeat(31) }).success).toBe(false);
  });
});

describe("userCreateSchema — password (12 + 4 clases)", () => {
  it("acepta una password que cumple las 4 clases y ≥12", () => {
    expect(userCreateSchema.safeParse(ok).success).toBe(true);
  });
  it("rechaza <12 caracteres", () => {
    expect(userCreateSchema.safeParse({ ...ok, password: "Ab1!xyz" }).success).toBe(false);
  });
  it("rechaza sin mayúscula", () => {
    expect(userCreateSchema.safeParse({ ...ok, password: "abcdef1234!x" }).success).toBe(false);
  });
  it("rechaza sin minúscula", () => {
    expect(userCreateSchema.safeParse({ ...ok, password: "ABCDEF1234!X" }).success).toBe(false);
  });
  it("rechaza sin dígito", () => {
    expect(userCreateSchema.safeParse({ ...ok, password: "Abcdefgh!xyz" }).success).toBe(false);
  });
  it("rechaza sin símbolo", () => {
    expect(userCreateSchema.safeParse({ ...ok, password: "Abcdef1234xy" }).success).toBe(false);
  });
});

describe("userCreateSchema — email / role", () => {
  it("normaliza email a minúsculas", () => {
    const r = userCreateSchema.safeParse({ ...ok, email: "SEC@AMDC.GOB.HN" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("sec@amdc.gob.hn");
  });
  it("rechaza email inválido", () => {
    expect(userCreateSchema.safeParse({ ...ok, email: "no-es-email" }).success).toBe(false);
  });
  it("rechaza rol desconocido", () => {
    expect(userCreateSchema.safeParse({ ...ok, role: "SUPERADMIN" }).success).toBe(false);
  });
});

describe("userUpdateSchema", () => {
  it("no incluye username ni password en la salida", () => {
    const r = userUpdateSchema.safeParse({
      id: "ckabcd012345abcdef0123456",
      email: ok.email,
      fullName: ok.fullName,
      role: "VIEWER",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("username" in r.data).toBe(false);
      expect("password" in r.data).toBe(false);
    }
  });
});

describe("passwordResetSchema", () => {
  it("aplica la misma política de password", () => {
    expect(
      passwordResetSchema.safeParse({ id: "ckabcd012345abcdef0123456", newPassword: "weak" })
        .success,
    ).toBe(false);
    expect(
      passwordResetSchema.safeParse({
        id: "ckabcd012345abcdef0123456",
        newPassword: "Abcdef1234!x",
      }).success,
    ).toBe(true);
  });
});
