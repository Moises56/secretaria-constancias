// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock } = vi.hoisted(() => ({ findUniqueMock: vi.fn() }));

vi.mock("@/server/db", () => ({
  prisma: {
    user: { findUnique: findUniqueMock },
  },
}));

import { invalidateSecurityStampCache, isSecurityStampValid } from "@/server/auth/security-stamp";

const USER_ID = "user_1";
const STAMP_A = new Date("2026-05-22T10:00:00.000Z");
const STAMP_B = new Date("2026-05-22T11:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-22T12:00:00Z"));
  findUniqueMock.mockReset();
  invalidateSecurityStampCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("isSecurityStampValid", () => {
  it("retorna true cuando coincide y caché la lectura", async () => {
    findUniqueMock.mockResolvedValueOnce({ securityStamp: STAMP_A, isActive: true });

    const a = await isSecurityStampValid(USER_ID, STAMP_A.toISOString());
    expect(a).toBe(true);

    // Segunda llamada en la misma ventana → cache hit, sin tocar BD
    const b = await isSecurityStampValid(USER_ID, STAMP_A.toISOString());
    expect(b).toBe(true);
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
  });

  it("retorna false si el stamp del token difiere del de la BD", async () => {
    findUniqueMock.mockResolvedValueOnce({ securityStamp: STAMP_B, isActive: true });

    const r = await isSecurityStampValid(USER_ID, STAMP_A.toISOString());
    expect(r).toBe(false);
  });

  it("retorna false si el usuario fue desactivado", async () => {
    findUniqueMock.mockResolvedValueOnce({ securityStamp: STAMP_A, isActive: false });

    const r = await isSecurityStampValid(USER_ID, STAMP_A.toISOString());
    expect(r).toBe(false);
  });

  it("retorna false si el usuario no existe", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const r = await isSecurityStampValid(USER_ID, STAMP_A.toISOString());
    expect(r).toBe(false);
  });

  it("re-consulta BD después de los 60s del TTL", async () => {
    findUniqueMock
      .mockResolvedValueOnce({ securityStamp: STAMP_A, isActive: true })
      .mockResolvedValueOnce({ securityStamp: STAMP_A, isActive: true });

    await isSecurityStampValid(USER_ID, STAMP_A.toISOString());
    expect(findUniqueMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_001);

    await isSecurityStampValid(USER_ID, STAMP_A.toISOString());
    expect(findUniqueMock).toHaveBeenCalledTimes(2);
  });

  it("invalidateSecurityStampCache fuerza re-lectura inmediata", async () => {
    findUniqueMock
      .mockResolvedValueOnce({ securityStamp: STAMP_A, isActive: true })
      .mockResolvedValueOnce({ securityStamp: STAMP_B, isActive: true });

    await isSecurityStampValid(USER_ID, STAMP_A.toISOString());
    invalidateSecurityStampCache(USER_ID);

    const r = await isSecurityStampValid(USER_ID, STAMP_A.toISOString());
    expect(r).toBe(false); // ahora la BD reporta STAMP_B
    expect(findUniqueMock).toHaveBeenCalledTimes(2);
  });
});
