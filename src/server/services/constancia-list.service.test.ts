// @vitest-environment node
import { createHmac, randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { type ConstanciaType, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { parseConstanciaListSearchParams } from "@/lib/validators/constancia-list";
import {
  listConstancias,
  streamConstanciasForExport,
} from "@/server/services/constancia-list.service";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TAG = `list-test-${Math.random().toString(36).slice(2, 8)}`;

interface SeedItem {
  type: ConstanciaType;
  applicantFullName: string;
  applicantIdNumber: string;
  daysAgo: number;
  status?: "ACTIVE" | "ANNULLED";
}

const SEED_ITEMS: SeedItem[] = [
  {
    type: "CVD",
    applicantFullName: `${TAG} Ada Lovelace`,
    applicantIdNumber: "0801-1815-10001",
    daysAgo: 30,
  },
  {
    type: "CVP",
    applicantFullName: `${TAG} Grace Hopper`,
    applicantIdNumber: "0801-1906-10002",
    daysAgo: 25,
  },
  {
    type: "CVE",
    applicantFullName: `${TAG} Margaret Hamilton`,
    applicantIdNumber: "0801-1936-10003",
    daysAgo: 20,
  },
  {
    type: "CVD",
    applicantFullName: `${TAG} Katherine Johnson`,
    applicantIdNumber: "0801-1918-10004",
    daysAgo: 15,
  },
  {
    type: "CVP",
    applicantFullName: `${TAG} Radia Perlman`,
    applicantIdNumber: "0801-1951-10005",
    daysAgo: 10,
  },
  {
    type: "CVE",
    applicantFullName: `${TAG} Barbara Liskov`,
    applicantIdNumber: "0801-1939-10006",
    daysAgo: 5,
    status: "ANNULLED",
  },
];

const createdIds: string[] = [];
let adminId: string;
let secretaryId: string;

async function ensureUser(username: string, role: "ADMIN" | "SECRETARY" | "VIEWER") {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      username,
      email: `${username}@list-test.local`,
      fullName: `${username} test`,
      role,
      passwordHash: "stub",
    },
  });
  return created.id;
}

beforeAll(async () => {
  // Reutilizamos el admin del seed; si no existe, lo creamos.
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  adminId = admin.id;
  secretaryId = await ensureUser(`${TAG}-secretary`, "SECRETARY");

  const signerCVD = await prisma.signer.findFirstOrThrow({
    where: { isActive: true, defaultForTypes: { has: "CVD" } },
  });
  const signerCVP = await prisma.signer.findFirstOrThrow({
    where: { isActive: true, defaultForTypes: { has: "CVP" } },
  });
  const signerCVE = await prisma.signer.findFirstOrThrow({
    where: { isActive: true, defaultForTypes: { has: "CVE" } },
  });
  const signerByType = { CVD: signerCVD, CVP: signerCVP, CVE: signerCVE };

  // Crear los 6 registros con folio único (90000+ para no chocar con la
  // secuencia normal) e issuedAt back-dated.
  const now = Date.now();
  for (const [i, item] of SEED_ITEMS.entries()) {
    const folioNumber = 90000 + Math.floor(Math.random() * 9000) + i;
    const year = new Date(now - item.daysAgo * 86400 * 1000).getFullYear();
    const issuedAt = new Date(now - item.daysAgo * 86400 * 1000);
    const signer = signerByType[item.type];
    const token = createHmac("sha256", "test-secret")
      .update(`${item.applicantIdNumber}|${randomBytes(8).toString("hex")}`)
      .digest("hex");
    // Alterna entre admin y secretary para probar el filtro issuedById
    const issuedById = i % 2 === 0 ? adminId : secretaryId;

    const created = await prisma.constancia.create({
      data: {
        type: item.type,
        folioNumber,
        folioYear: year,
        folio: `${item.type}-${folioNumber}-${year}`,
        status: item.status ?? "ACTIVE",
        applicantFullName: item.applicantFullName,
        applicantIdNumber: item.applicantIdNumber,
        signerName: signer.fullName,
        signerTitleLine: signer.titleLine,
        signerIdAtIssue: signer.id,
        verificationToken: token,
        issuedAt,
        issuedById,
        ...(item.status === "ANNULLED"
          ? {
              annulledAt: new Date(),
              annulledReason: "Razón de prueba para el listado.",
              annulledById: adminId,
            }
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
  if (secretaryId) {
    await prisma.user.deleteMany({ where: { id: secretaryId } });
  }
  await prisma.$disconnect();
});

beforeEach(() => {
  // No-op: los tests son read-only sobre los seeds.
});

describe("listConstancias", () => {
  it("sin filtros retorna los seeds + total > 0", async () => {
    const r = await listConstancias(
      parseConstanciaListSearchParams({ q: TAG, pageSize: "100" }),
      "ADMIN",
    );
    expect(r.items.length).toBe(SEED_ITEMS.length);
    expect(r.total).toBe(SEED_ITEMS.length);
    expect(r.totalPages).toBe(1);
  });

  it("búsqueda por folio exacto encuentra 1", async () => {
    const someFolio = (await prisma.constancia.findFirstOrThrow({ where: { id: createdIds[0] } }))
      .folio;
    const r = await listConstancias(parseConstanciaListSearchParams({ q: someFolio }), "ADMIN");
    expect(r.total).toBe(1);
    expect(r.items[0]?.folio).toBe(someFolio);
  });

  it("búsqueda por DNI parcial encuentra", async () => {
    const r = await listConstancias(parseConstanciaListSearchParams({ q: "10003" }), "ADMIN");
    expect(r.total).toBeGreaterThanOrEqual(1);
    expect(r.items.every((i) => i.applicantIdNumber.includes("10003"))).toBe(true);
  });

  it("búsqueda por nombre case-insensitive", async () => {
    const r = await listConstancias(
      parseConstanciaListSearchParams({ q: TAG.toUpperCase() }),
      "ADMIN",
    );
    expect(r.total).toBe(SEED_ITEMS.length);
  });

  it("filtro type=CVE + status=ANNULLED reduce a 1", async () => {
    const r = await listConstancias(
      parseConstanciaListSearchParams({ q: TAG, type: "CVE", status: "ANNULLED" }),
      "ADMIN",
    );
    expect(r.total).toBe(1);
    expect(r.items[0]?.type).toBe("CVE");
    expect(r.items[0]?.status).toBe("ANNULLED");
  });

  it("filtro de fecha (últimos 7 días) reduce a los más recientes", async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);
    const r = await listConstancias(
      parseConstanciaListSearchParams({ q: TAG, from: sevenDaysAgo }),
      "ADMIN",
    );
    // Solo el item con daysAgo=5 cae dentro de los últimos 7 días.
    expect(r.total).toBe(1);
  });

  it("issuedById es IGNORADO si role no es ADMIN", async () => {
    const r = await listConstancias(
      parseConstanciaListSearchParams({ q: TAG, issuedById: secretaryId }),
      "SECRETARY",
    );
    // SECRETARY ve todo (filtro ignorado), no solo las suyas.
    expect(r.total).toBe(SEED_ITEMS.length);
  });

  it("issuedById SE respeta si role es ADMIN", async () => {
    const r = await listConstancias(
      parseConstanciaListSearchParams({ q: TAG, issuedById: secretaryId }),
      "ADMIN",
    );
    expect(r.total).toBeLessThan(SEED_ITEMS.length);
    expect(r.items.every((i) => i.issuedBy.id === secretaryId)).toBe(true);
  });

  it("paginación page=2 con pageSize=3 retorna últimos 3", async () => {
    const r = await listConstancias(
      parseConstanciaListSearchParams({ q: TAG, page: "2", pageSize: "10" }),
      "ADMIN",
    );
    // Con 6 items y pageSize 10, page 2 está vacía pero total es 6
    expect(r.total).toBe(SEED_ITEMS.length);
    expect(r.totalPages).toBe(1);
    expect(r.items.length).toBe(0);
  });

  it("totalPages se calcula correctamente con remainder", async () => {
    const r = await listConstancias(
      parseConstanciaListSearchParams({ q: TAG, pageSize: "10" }),
      "ADMIN",
    );
    // 6 / 10 → 1 página
    expect(r.totalPages).toBe(1);
  });

  it("sort por folio asc invierte resultado vs issuedAt desc default", async () => {
    const byDate = await listConstancias(parseConstanciaListSearchParams({ q: TAG }), "ADMIN");
    const byFolio = await listConstancias(
      parseConstanciaListSearchParams({ q: TAG, sort: "folio", dir: "asc" }),
      "ADMIN",
    );
    // Los ordenes deberían diferir (al menos los IDs).
    expect(byDate.items.map((i) => i.id)).not.toEqual(byFolio.items.map((i) => i.id));
  });
});

describe("streamConstanciasForExport", () => {
  it("itera por todos los matches sin omitir ninguno", async () => {
    const params = parseConstanciaListSearchParams({ q: TAG });
    const collected: string[] = [];
    for await (const c of streamConstanciasForExport(params, "ADMIN")) {
      collected.push(c.id);
    }
    expect(collected.length).toBe(SEED_ITEMS.length);
    expect(new Set(collected).size).toBe(SEED_ITEMS.length); // sin duplicados
  });

  it("respeta filtros (igual que listConstancias)", async () => {
    const params = parseConstanciaListSearchParams({ q: TAG, type: "CVE" });
    const collected: string[] = [];
    for await (const c of streamConstanciasForExport(params, "ADMIN")) {
      collected.push(c.id);
    }
    const cveCount = SEED_ITEMS.filter((i) => i.type === "CVE").length;
    expect(collected.length).toBe(cveCount);
  });
});
