import "dotenv/config";

import { prisma } from "./helpers/db";

/**
 * Sincroniza `FolioSequence` con el MAX(folioNumber) real por (type, year)
 * antes de correr la suite E2E. El DB de desarrollo drifta (FolioSequence puede
 * quedar vacío o por debajo del max tras borrados/restauraciones de dumps), y
 * eso rompe la creación de constancias con UniqueConstraintViolation
 * (`generateFolio` arranca en 1 y choca con folios existentes).
 *
 * Mismo repair idempotente que `prisma/seed.ts`: solo sube el contador, nunca
 * lo baja. Hace la suite auto-sanable sin depender de re-seedear a mano.
 */
async function globalSetup() {
  const stats = await prisma.constancia.groupBy({
    by: ["type", "folioYear"],
    _max: { folioNumber: true },
  });

  for (const row of stats) {
    const maxNumber = row._max.folioNumber ?? 0;
    const seq = await prisma.folioSequence.findUnique({
      where: { type_year: { type: row.type, year: row.folioYear } },
      select: { lastNumber: true },
    });
    if (!seq || seq.lastNumber < maxNumber) {
      await prisma.folioSequence.upsert({
        where: { type_year: { type: row.type, year: row.folioYear } },
        create: { type: row.type, year: row.folioYear, lastNumber: maxNumber },
        update: { lastNumber: maxNumber },
      });
    }
  }

  await prisma.$disconnect();
}

export default globalSetup;
