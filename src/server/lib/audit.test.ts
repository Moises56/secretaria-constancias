// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@/server/db", () => ({
  prisma: { auditLog: { create: createMock } },
}));

import { prisma } from "@/server/db";
import {
  AuditAction,
  recordAuditExported,
  recordConstanciaAnnulled,
  recordConstanciaCreated,
  recordConstanciaExported,
  recordConstanciaVerified,
  recordLogin,
  recordLoginBlocked,
  recordLoginFailed,
  recordLogout,
  recordSignerCreated,
  recordSignerUpdated,
  recordUserCreated,
  recordUserDeactivated,
  recordUserPasswordReset,
  recordUserReactivated,
  recordUserUpdated,
} from "@/server/lib/audit";

// El mock de prisma sirve TAMBIÉN como `tx` para los helpers transaccionales
// (PrismaLike incluye `typeof prisma`).
const tx = prisma;

function lastData() {
  return createMock.mock.calls.at(-1)?.[0]?.data as {
    action: string;
    entity?: string | null;
    entityId?: string | null;
    userId?: string | null;
    metadata?: unknown;
  };
}

/** Ninguna metadata de auditoría debe contener secretos. */
function expectNoSecrets(metadata: unknown) {
  expect(JSON.stringify(metadata ?? {})).not.toMatch(/passwordhash|"password"|hash|token/i);
}

afterEach(() => createMock.mockReset());

describe("audit — helpers transaccionales (FASE 9)", () => {
  it("recordSignerCreated", async () => {
    await recordSignerCreated({
      tx,
      userId: "actor1",
      signerId: "s1",
      fullName: "Diana Cruz",
      defaultForTypes: ["CVD", "CVP"],
      isActive: true,
    });
    const d = lastData();
    expect(d.action).toBe(AuditAction.SIGNER_CREATED);
    expect(d.entity).toBe("Signer");
    expect(d.entityId).toBe("s1");
    expect(d.userId).toBe("actor1");
  });

  it("recordSignerUpdated guarda changedFields + before/after", async () => {
    await recordSignerUpdated({
      tx,
      userId: "actor1",
      signerId: "s1",
      changedFields: ["isActive"],
      before: { isActive: true, defaultForTypes: ["CVD"] },
      after: { isActive: false, defaultForTypes: ["CVD"] },
    });
    const d = lastData();
    expect(d.action).toBe(AuditAction.SIGNER_UPDATED);
    expect((d.metadata as { changedFields: string[] }).changedFields).toEqual(["isActive"]);
  });

  it("recordUserCreated: actor en userId, target en entityId, sin secretos", async () => {
    await recordUserCreated({
      tx,
      actorId: "admin1",
      targetUserId: "u9",
      username: "jlopez",
      role: "SECRETARY",
    });
    const d = lastData();
    expect(d.action).toBe(AuditAction.USER_CREATED);
    expect(d.userId).toBe("admin1");
    expect(d.entityId).toBe("u9");
    expectNoSecrets(d.metadata);
  });

  it("recordUserUpdated incluye roleChange solo si se pasa", async () => {
    await recordUserUpdated({
      tx,
      actorId: "admin1",
      targetUserId: "u9",
      changedFields: ["role"],
      roleChange: { before: "SECRETARY", after: "VIEWER" },
    });
    const d = lastData();
    expect(d.action).toBe(AuditAction.USER_UPDATED);
    expect((d.metadata as { roleChange?: unknown }).roleChange).toEqual({
      before: "SECRETARY",
      after: "VIEWER",
    });
  });

  it("recordUserDeactivated / Reactivated / PasswordReset solo guardan username", async () => {
    await recordUserDeactivated({ tx, actorId: "a", targetUserId: "u", username: "jlopez" });
    expect(lastData().action).toBe(AuditAction.USER_DEACTIVATED);

    await recordUserReactivated({ tx, actorId: "a", targetUserId: "u", username: "jlopez" });
    expect(lastData().action).toBe(AuditAction.USER_REACTIVATED);

    await recordUserPasswordReset({ tx, actorId: "a", targetUserId: "u", username: "jlopez" });
    const d = lastData();
    expect(d.action).toBe(AuditAction.USER_PASSWORD_RESET);
    expect(d.metadata).toEqual({ username: "jlopez" });
    expectNoSecrets(d.metadata);
  });

  it("recordConstanciaCreated registra folio/type/signer", async () => {
    await recordConstanciaCreated({
      tx,
      userId: "u1",
      constanciaId: "c1",
      folio: "CVE-3-2026",
      type: "CVE",
      signerId: "s1",
      paperSerial: "SM-1",
    });
    const d = lastData();
    expect(d.action).toBe(AuditAction.CONSTANCIA_CREATED);
    expect(d.entity).toBe("Constancia");
    expect(d.entityId).toBe("c1");
  });

  it("recordConstanciaAnnulled", async () => {
    await recordConstanciaAnnulled({
      tx,
      userId: "u1",
      constanciaId: "c1",
      folio: "CVE-3-2026",
      reason: "Datos incorrectos del solicitante",
    });
    expect(lastData().action).toBe(AuditAction.CONSTANCIA_ANNULLED);
  });
});

describe("audit — helpers directos (prisma global)", () => {
  it("recordLogin", async () => {
    await recordLogin({ userId: "u1", ipAddress: "1.2.3.4", userAgent: "ua" });
    const d = lastData();
    expect(d.action).toBe(AuditAction.LOGIN);
    expect(d.userId).toBe("u1");
  });

  it("recordLoginFailed NO guarda el password (solo identifier + reason)", async () => {
    await recordLoginFailed({ identifier: "admin", reason: "bad_password", ipAddress: "1.2.3.4" });
    const d = lastData();
    expect(d.action).toBe(AuditAction.LOGIN_FAILED);
    expect((d.metadata as { reason: string }).reason).toBe("bad_password");
    expectNoSecrets(d.metadata);
  });

  it("recordLoginBlocked y recordLogout", async () => {
    await recordLoginBlocked({ identifier: "admin", ipAddress: "1.2.3.4" });
    expect(lastData().action).toBe(AuditAction.LOGIN_BLOCKED);
    await recordLogout({ userId: "u1", ipAddress: "1.2.3.4" });
    expect(lastData().action).toBe(AuditAction.LOGOUT);
  });

  it("recordConstanciaVerified guarda solo tokenPrefix, nunca el token completo", async () => {
    await recordConstanciaVerified({
      ipAddress: "1.2.3.4",
      userAgent: "ua",
      tokenPrefix: "abcd1234",
      result: "FOUND_ACTIVE",
      constanciaId: "c1",
    });
    const d = lastData();
    expect(d.action).toBe(AuditAction.CONSTANCIA_VERIFIED);
    expect((d.metadata as { tokenPrefix: string }).tokenPrefix).toBe("abcd1234");
    expect((d.metadata as { tokenPrefix: string }).tokenPrefix.length).toBeLessThanOrEqual(8);
  });

  it("recordConstanciaVerified sin constanciaId → entity null (NOT_FOUND)", async () => {
    await recordConstanciaVerified({
      ipAddress: null,
      userAgent: null,
      tokenPrefix: "00000000",
      result: "NOT_FOUND",
    });
    expect(lastData().entity).toBeNull();
  });

  it("recordConstanciaExported y recordAuditExported registran rowCount + filtros", async () => {
    await recordConstanciaExported({ userId: "u1", filters: { type: "CVE" }, rowCount: 12 });
    expect(lastData().action).toBe(AuditAction.CONSTANCIA_EXPORTED);

    await recordAuditExported({ userId: "u1", filters: { action: "LOGIN" }, rowCount: 7 });
    const d = lastData();
    expect(d.action).toBe(AuditAction.AUDIT_EXPORTED);
    expect((d.metadata as { rowCount: number }).rowCount).toBe(7);
  });
});
