// @vitest-environment node
import { describe, expect, it } from "vitest";

import { generateConstanciaPdf } from "@/server/services/pdf.service";

function fixtureConstancia(overrides: Partial<Parameters<typeof generateConstanciaPdf>[0]> = {}) {
  return {
    id: "ckabcd012345abcdef0123456",
    type: "CVE",
    folioNumber: 2366,
    folioYear: 2026,
    folio: "CVE-2366-2026",
    status: "ACTIVE",
    applicantFullName: "Ángela Judith García Nolasco",
    applicantIdNumber: "0801-1997-11539",
    paperSerial: "SM-2348",
    signerName: "César Antonio Pinto Pacheco",
    signerTitleLine: "Secretario Municipal del Distrito Central",
    signerIdAtIssue: "ckxyz0000000000000000000",
    verificationToken: "a".repeat(64),
    issuedAt: new Date(2026, 4, 20),
    issuedById: "ckuser00000000000000",
    annulledAt: null,
    annulledReason: null,
    annulledById: null,
    createdAt: new Date(2026, 4, 20),
    updatedAt: new Date(2026, 4, 20),
    ...overrides,
  } as Parameters<typeof generateConstanciaPdf>[0];
}

describe("generateConstanciaPdf", () => {
  it("retorna un Buffer con magic bytes %PDF", async () => {
    const buf = await generateConstanciaPdf(fixtureConstancia());
    expect(Buffer.isBuffer(buf)).toBe(true);
    // %PDF en ASCII = 0x25 0x50 0x44 0x46
    expect(buf[0]).toBe(0x25);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x44);
    expect(buf[3]).toBe(0x46);
    expect(buf.length).toBeGreaterThan(2000);
  }, 30_000);

  it("el contenido cambia entre CVD y CVE (cláusula internacional)", async () => {
    const cvd = await generateConstanciaPdf(fixtureConstancia({ type: "CVD" }));
    const cve = await generateConstanciaPdf(fixtureConstancia({ type: "CVE" }));
    // No comparamos texto exacto (compresión), pero el tamaño debería diferir.
    expect(cve.length).not.toBe(cvd.length);
  }, 30_000);
});
