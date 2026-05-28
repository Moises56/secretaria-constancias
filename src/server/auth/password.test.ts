// @vitest-environment node
import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/server/auth/password";

describe("password (argon2id)", () => {
  it("hashPassword produce un hash argon2id, no el texto plano", async () => {
    const hash = await hashPassword("Abcdef1234!x");
    expect(hash).not.toBe("Abcdef1234!x");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("verifyPassword: true con la contraseña correcta, false con la incorrecta", async () => {
    const hash = await hashPassword("Abcdef1234!x");
    expect(await verifyPassword(hash, "Abcdef1234!x")).toBe(true);
    expect(await verifyPassword(hash, "otra-distinta")).toBe(false);
  });

  it("dos hashes de la misma contraseña difieren (salt aleatorio)", async () => {
    const a = await hashPassword("Abcdef1234!x");
    const b = await hashPassword("Abcdef1234!x");
    expect(a).not.toBe(b);
  });
});
