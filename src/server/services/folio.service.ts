import "server-only";

import { type ConstanciaType, type Prisma } from "@prisma/client";

export interface GeneratedFolio {
  folio: string;
  folioNumber: number;
  folioYear: number;
}

/**
 * Reserva atómicamente el siguiente folio para `type` en el año actual.
 *
 * Debe invocarse DENTRO de la transacción que crea la Constancia, con
 * `prisma.$transaction(async (tx) => { ... }, { isolationLevel: "Serializable" })`.
 * Esto garantiza:
 *   1. Ausencia de gaps en la secuencia visible si la creación falla
 *      (el rollback revierte también el incremento del contador).
 *   2. Ausencia de colisiones bajo concurrencia (dos llamadas simultáneas
 *      con el mismo `type` y año reciben números distintos consecutivos).
 *
 * El campo `folio` retornado incluye el prefijo del tipo (`CVE-2366-2026`) y
 * se almacena así en BD para búsqueda interna; el PDF físico imprime solo
 * `{folioNumber}-{folioYear}` (ej. `2366-2026`).
 */
export async function generateFolio(
  type: ConstanciaType,
  tx: Prisma.TransactionClient,
): Promise<GeneratedFolio> {
  const year = new Date().getFullYear();

  const seq = await tx.folioSequence.upsert({
    where: { type_year: { type, year } },
    create: { type, year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });

  return {
    folio: `${type}-${seq.lastNumber}-${year}`,
    folioNumber: seq.lastNumber,
    folioYear: year,
  };
}
