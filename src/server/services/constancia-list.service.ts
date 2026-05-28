import "server-only";

import { type Prisma, type Role } from "@prisma/client";

import { type ConstanciaListSearchParams } from "@/lib/validators/constancia-list";
import { prisma } from "@/server/db";

const LIST_SELECT = {
  id: true,
  folio: true,
  folioNumber: true,
  folioYear: true,
  type: true,
  status: true,
  applicantFullName: true,
  applicantIdNumber: true,
  paperSerial: true,
  issuedAt: true,
  issuedBy: { select: { id: true, fullName: true } },
} as const;

const EXPORT_SELECT = {
  ...LIST_SELECT,
  signerName: true,
  signerTitleLine: true,
  annulledAt: true,
  annulledReason: true,
} as const;

export type ConstanciaListItem = Prisma.ConstanciaGetPayload<{ select: typeof LIST_SELECT }>;
export type ConstanciaExportItem = Prisma.ConstanciaGetPayload<{ select: typeof EXPORT_SELECT }>;

export interface ConstanciaListResult {
  items: ConstanciaListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Construye la cláusula `where` aplicable tanto al listado paginado como al
 * stream de export. AMBOS deben ver exactamente el mismo conjunto.
 *
 * Reglas de defensa:
 *  - `issuedById` solo se respeta si el viewer es ADMIN.
 *  - Las fechas se interpretan en zona local del servidor (Tegucigalpa
 *    sin DST → UTC-6); `to` incluye todo el día (23:59:59.999).
 */
export function buildConstanciaListWhere(
  params: Partial<ConstanciaListSearchParams>,
  viewerRole: Role,
): Prisma.ConstanciaWhereInput {
  const conditions: Prisma.ConstanciaWhereInput[] = [];

  if (params.q) {
    conditions.push({
      OR: [
        { folio: { contains: params.q, mode: "insensitive" } },
        { applicantFullName: { contains: params.q, mode: "insensitive" } },
        { applicantIdNumber: { contains: params.q } },
      ],
    });
  }

  if (params.type) conditions.push({ type: params.type });
  if (params.status) conditions.push({ status: params.status });

  if (params.from || params.to) {
    const range: Prisma.DateTimeFilter = {};
    if (params.from) range.gte = new Date(`${params.from}T00:00:00`);
    if (params.to) range.lte = new Date(`${params.to}T23:59:59.999`);
    conditions.push({ issuedAt: range });
  }

  // ADMIN-only: filtro por usuario que emitió.
  if (params.issuedById && viewerRole === "ADMIN") {
    conditions.push({ issuedById: params.issuedById });
  }

  return conditions.length === 0 ? {} : { AND: conditions };
}

export async function listConstancias(
  params: ConstanciaListSearchParams,
  viewerRole: Role,
): Promise<ConstanciaListResult> {
  const where = buildConstanciaListWhere(params, viewerRole);

  const [items, total] = await prisma.$transaction([
    prisma.constancia.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { [params.sort]: params.dir },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.constancia.count({ where }),
  ]);

  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

/**
 * Async generator que recorre TODOS los registros que matchean los filtros
 * en lotes de 200, usando cursor pagination. Diseñado para streaming a CSV
 * sin acumular memoria.
 *
 * Importante: ignora `page` y `pageSize` — el export trae todo lo filtrado.
 */
export async function* streamConstanciasForExport(
  params: Omit<ConstanciaListSearchParams, "page" | "pageSize">,
  viewerRole: Role,
): AsyncGenerator<ConstanciaExportItem, void, unknown> {
  const where = buildConstanciaListWhere(params, viewerRole);
  const BATCH_SIZE = 200;
  let cursorId: string | undefined;

  while (true) {
    const batch: ConstanciaExportItem[] = await prisma.constancia.findMany({
      where,
      select: EXPORT_SELECT,
      orderBy: { [params.sort]: params.dir },
      take: BATCH_SIZE,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });
    if (batch.length === 0) break;
    for (const item of batch) yield item;
    if (batch.length < BATCH_SIZE) break;
    cursorId = batch[batch.length - 1]!.id;
  }
}
