// @vitest-environment node
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ConstanciaType,
  PrismaClient,
  type PrismaClient as PrismaClientType,
} from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { withRetries } from "@/server/lib/with-retries";
import { generateFolio } from "@/server/services/folio.service";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma: PrismaClientType = new PrismaClient({ adapter });

// Este test corre contra el DB COMPARTIDO de dev y limpia FolioSequence para
// aislar generateFolio. Snapshot ANTES y restore EXACTO después, para dejar la
// tabla tal cual se encontró (no vacía → rompería la creación de constancias;
// no inflada → folios feos). No recomputamos desde Constancia (carrera con
// otros tests de integración que crean constancias temporales).
let folioSnapshot: { type: ConstanciaType; year: number; lastNumber: number }[] = [];

async function callGenerateFolio(type: ConstanciaType) {
  return withRetries(() =>
    prisma.$transaction((tx) => generateFolio(type, tx), {
      isolationLevel: "Serializable",
    }),
  );
}

beforeAll(async () => {
  folioSnapshot = await prisma.folioSequence.findMany({
    select: { type: true, year: true, lastNumber: true },
  });
});

beforeEach(async () => {
  await prisma.folioSequence.deleteMany({});
});

afterAll(async () => {
  await prisma.folioSequence.deleteMany({});
  if (folioSnapshot.length > 0) {
    await prisma.folioSequence.createMany({ data: folioSnapshot });
  }
  await prisma.$disconnect();
});

describe("generateFolio", () => {
  it("primera llamada retorna folioNumber 1 y el año actual", async () => {
    const year = new Date().getFullYear();
    const r = await callGenerateFolio(ConstanciaType.CVD);
    expect(r.folioNumber).toBe(1);
    expect(r.folioYear).toBe(year);
    expect(r.folio).toBe(`CVD-1-${year}`);
  });

  it("llamadas sucesivas incrementan 1, 2, 3", async () => {
    const a = await callGenerateFolio(ConstanciaType.CVD);
    const b = await callGenerateFolio(ConstanciaType.CVD);
    const c = await callGenerateFolio(ConstanciaType.CVD);
    expect([a.folioNumber, b.folioNumber, c.folioNumber]).toEqual([1, 2, 3]);
  });

  it("tipos distintos mantienen secuencias independientes en el mismo año", async () => {
    const cvd1 = await callGenerateFolio(ConstanciaType.CVD);
    const cvp1 = await callGenerateFolio(ConstanciaType.CVP);
    const cve1 = await callGenerateFolio(ConstanciaType.CVE);
    const cvd2 = await callGenerateFolio(ConstanciaType.CVD);
    const cve2 = await callGenerateFolio(ConstanciaType.CVE);

    expect(cvd1.folioNumber).toBe(1);
    expect(cvp1.folioNumber).toBe(1);
    expect(cve1.folioNumber).toBe(1);
    expect(cvd2.folioNumber).toBe(2);
    expect(cve2.folioNumber).toBe(2);
  });

  it("20 llamadas concurrentes mismo tipo → 20 números únicos consecutivos", async () => {
    const N = 20;
    const results = await Promise.all(
      Array.from({ length: N }, () => callGenerateFolio(ConstanciaType.CVP)),
    );

    const numbers = results.map((r) => r.folioNumber).sort((a, b) => a - b);
    const unique = new Set(numbers);

    expect(unique.size).toBe(N);
    expect(numbers).toEqual(Array.from({ length: N }, (_, i) => i + 1));
  }, 30_000);

  it("año explícito en FolioSequence: simular rollover al insertar lastNumber=0 en otro año", async () => {
    // No mockeamos Date — verificamos que dos años distintos coexisten con
    // sus contadores independientes en la misma tabla.
    const currentYear = new Date().getFullYear();
    const futureYear = currentYear + 1;

    await prisma.folioSequence.create({
      data: { type: ConstanciaType.CVD, year: futureYear, lastNumber: 0 },
    });

    // Llamada al año actual NO debe afectar la fila del año futuro.
    const r = await callGenerateFolio(ConstanciaType.CVD);
    expect(r.folioNumber).toBe(1);
    expect(r.folioYear).toBe(currentYear);

    const future = await prisma.folioSequence.findUnique({
      where: { type_year: { type: ConstanciaType.CVD, year: futureYear } },
    });
    expect(future?.lastNumber).toBe(0);

    // TODO(v2): mockear `new Date()` para validar que `generateFolio` en el
    // año futuro arranca en 1 (omitido aquí por simplicidad — la lógica de
    // upsert no depende de cómo se construya el year).
  });
});
