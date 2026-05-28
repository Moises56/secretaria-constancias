// @vitest-environment node
import { createHmac, randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { type ConstanciaType, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { __computeStatsUncached } from "@/server/services/stats.service";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TAG = `stats-test-${Math.random().toString(36).slice(2, 8)}`;
const createdIds: string[] = [];
let adminId: string;
let secretaryUserId: string;

interface SeedSpec {
  type: ConstanciaType;
  daysAgo: number;
  status?: "ACTIVE" | "ANNULLED";
  issuedByAdmin?: boolean;
}

const SEEDS: SeedSpec[] = [
  // Periodo actual (últimos 30 días)
  { type: "CVD", daysAgo: 1, issuedByAdmin: true },
  { type: "CVD", daysAgo: 5, issuedByAdmin: true },
  { type: "CVP", daysAgo: 10, issuedByAdmin: false },
  { type: "CVP", daysAgo: 12, issuedByAdmin: true },
  { type: "CVE", daysAgo: 18, issuedByAdmin: false },
  { type: "CVE", daysAgo: 20, issuedByAdmin: false, status: "ANNULLED" },
  // Periodo previo (30-60 días atrás)
  { type: "CVD", daysAgo: 35, issuedByAdmin: true },
  { type: "CVP", daysAgo: 45, issuedByAdmin: true },
];

async function ensureSecondaryUser(): Promise<string> {
  const username = `${TAG}-sec`;
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return existing.id;
  const u = await prisma.user.create({
    data: {
      username,
      email: `${username}@stats-test.local`,
      fullName: `${TAG} Secretary`,
      role: "SECRETARY",
      passwordHash: "stub",
    },
  });
  return u.id;
}

beforeAll(async () => {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  adminId = admin.id;
  secretaryUserId = await ensureSecondaryUser();

  const signerByType = {
    CVD: await prisma.signer.findFirstOrThrow({
      where: { isActive: true, defaultForTypes: { has: "CVD" } },
    }),
    CVP: await prisma.signer.findFirstOrThrow({
      where: { isActive: true, defaultForTypes: { has: "CVP" } },
    }),
    CVE: await prisma.signer.findFirstOrThrow({
      where: { isActive: true, defaultForTypes: { has: "CVE" } },
    }),
  };

  const now = Date.now();
  for (const [i, s] of SEEDS.entries()) {
    const issuedAt = new Date(now - s.daysAgo * 86400 * 1000);
    const signer = signerByType[s.type];
    const folioNumber = 95000 + Math.floor(Math.random() * 4000) + i;
    const token = createHmac("sha256", "stats-test")
      .update(`${TAG}|${i}|${randomBytes(6).toString("hex")}`)
      .digest("hex");

    const issuedById = s.issuedByAdmin ? adminId : secretaryUserId;

    const created = await prisma.constancia.create({
      data: {
        type: s.type,
        folioNumber,
        folioYear: issuedAt.getFullYear(),
        folio: `${s.type}-${folioNumber}-${issuedAt.getFullYear()}`,
        status: s.status ?? "ACTIVE",
        applicantFullName: `${TAG} Solicitante ${i}`,
        applicantIdNumber: `0801-1990-${String(50000 + i).padStart(5, "0")}`,
        signerName: signer.fullName,
        signerTitleLine: signer.titleLine,
        signerIdAtIssue: signer.id,
        verificationToken: token,
        issuedAt,
        issuedById,
        ...(s.status === "ANNULLED"
          ? { annulledAt: new Date(), annulledReason: "test", annulledById: adminId }
          : {}),
      },
      select: { id: true },
    });
    createdIds.push(created.id);
  }
});

afterAll(async () => {
  if (createdIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: createdIds } } });
    await prisma.constancia.deleteMany({ where: { id: { in: createdIds } } });
  }
  if (secretaryUserId) {
    await prisma.user.deleteMany({ where: { id: secretaryUserId } });
  }
  await prisma.$disconnect();
});

// Rango: últimos 30 días — debería capturar los 6 primeros seeds.
function makeRange() {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);

  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - (to.getTime() - from.getTime()));
  return { from, to, previousFrom, previousTo };
}

describe("__computeStatsUncached (sin caché)", () => {
  it("total actual cuenta solo ACTIVE del rango", async () => {
    const r = makeRange();
    const stats = await __computeStatsUncached({ ...r, role: "ADMIN" });
    // 6 seeds en periodo actual, pero 1 está ANNULLED → 5 ACTIVE
    // Sin embargo el filtro de "tag" es por dataset global; los seeds del
    // TAG son los únicos con el patrón TAG en applicantFullName, pero la
    // query del servicio NO filtra por TAG. Aceptamos > 0 ó delta.
    expect(stats.totalCurrent).toBeGreaterThanOrEqual(5);
    expect(stats.annulled).toBeGreaterThanOrEqual(1);
  });

  it("byType retorna shape completo con 0s para tipos sin filas", async () => {
    const r = makeRange();
    const stats = await __computeStatsUncached({ ...r, role: "ADMIN" });
    expect(stats.byType).toHaveProperty("CVD");
    expect(stats.byType).toHaveProperty("CVP");
    expect(stats.byType).toHaveProperty("CVE");
    expect(typeof stats.byType.CVD).toBe("number");
  });

  it("series pre-pobla TODOS los días del rango (incluyendo días en 0)", async () => {
    const r = makeRange();
    const stats = await __computeStatsUncached({ ...r, role: "ADMIN" });
    // 30 días inclusivos
    expect(stats.series.length).toBe(30);
    // Ordenados ascendentemente
    for (let i = 1; i < stats.series.length; i++) {
      expect(stats.series[i]!.date >= stats.series[i - 1]!.date).toBe(true);
    }
    // Todos tienen `count` numérico ≥ 0
    for (const p of stats.series) expect(p.count).toBeGreaterThanOrEqual(0);
  });

  it("pctChange null cuando previo es 0", async () => {
    // Rango futuro lejano: ambos periodos sin datos
    const future = new Date(2030, 0, 1);
    const futureEnd = new Date(2030, 0, 31, 23, 59, 59, 999);
    const stats = await __computeStatsUncached({
      from: future,
      to: futureEnd,
      previousFrom: new Date(2029, 11, 1),
      previousTo: new Date(2029, 11, 31, 23, 59, 59, 999),
      role: "ADMIN",
    });
    expect(stats.totalCurrent).toBe(0);
    expect(stats.totalPrevious).toBe(0);
    expect(stats.pctChange).toBeNull();
  });

  it("topEmisores es null para SECRETARY y VIEWER", async () => {
    const r = makeRange();
    const sec = await __computeStatsUncached({ ...r, role: "SECRETARY" });
    const vie = await __computeStatsUncached({ ...r, role: "VIEWER" });
    expect(sec.topEmisores).toBeNull();
    expect(vie.topEmisores).toBeNull();
  });

  it("topEmisores es array (puede ser []) cuando role=ADMIN", async () => {
    const r = makeRange();
    const stats = await __computeStatsUncached({ ...r, role: "ADMIN" });
    expect(Array.isArray(stats.topEmisores)).toBe(true);
    if (stats.topEmisores) {
      expect(stats.topEmisores.length).toBeLessThanOrEqual(5);
      // Ordenado desc por count
      for (let i = 1; i < stats.topEmisores.length; i++) {
        expect(stats.topEmisores[i]!.count).toBeLessThanOrEqual(stats.topEmisores[i - 1]!.count);
      }
    }
  });

  it("topEmisores incluye fullName resuelto (no userId crudo)", async () => {
    const r = makeRange();
    const stats = await __computeStatsUncached({ ...r, role: "ADMIN" });
    if (stats.topEmisores && stats.topEmisores.length > 0) {
      const found = stats.topEmisores.find((e) => e.userId === adminId);
      expect(found).toBeDefined();
      expect(found?.fullName).toMatch(/admin|sistema/i);
    }
  });
});
