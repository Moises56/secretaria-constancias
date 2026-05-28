import "server-only";

import { type Prisma } from "@prisma/client";

import { type AuditListSearchParams } from "@/lib/validators/audit";
import { prisma } from "@/server/db";

const LIST_SELECT = {
  id: true,
  action: true,
  entity: true,
  entityId: true,
  ipAddress: true,
  userAgent: true,
  metadata: true,
  createdAt: true,
  user: { select: { id: true, username: true, fullName: true } },
} as const;

export type AuditLogListItem = Prisma.AuditLogGetPayload<{ select: typeof LIST_SELECT }>;

export interface AuditLogListResult {
  items: AuditLogListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * `where` compartido entre el listado paginado y el stream de export — ambos
 * deben ver el mismo conjunto. AUDIT_VIEW ya es solo-ADMIN, así que NO hay
 * role-scoping adicional (el admin ve todo el log).
 */
export function buildAuditListWhere(
  params: Partial<AuditListSearchParams>,
): Prisma.AuditLogWhereInput {
  const conditions: Prisma.AuditLogWhereInput[] = [];

  if (params.action) conditions.push({ action: params.action });
  if (params.userId) conditions.push({ userId: params.userId });
  if (params.entity) conditions.push({ entity: params.entity });

  if (params.from || params.to) {
    const range: Prisma.DateTimeFilter = {};
    if (params.from) range.gte = new Date(`${params.from}T00:00:00`);
    if (params.to) range.lte = new Date(`${params.to}T23:59:59.999`);
    conditions.push({ createdAt: range });
  }

  return conditions.length === 0 ? {} : { AND: conditions };
}

export async function listAuditLogs(params: AuditListSearchParams): Promise<AuditLogListResult> {
  const where = buildAuditListWhere(params);

  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      select: LIST_SELECT,
      // createdAt como orden principal; id como tiebreak estable (mismo ms).
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.auditLog.count({ where }),
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
 * Async generator por cursor (lotes de 200) para el export CSV sin acumular
 * memoria. El cursor por `id` es estable porque `id` participa en el orderBy.
 * Ignora `page`/`pageSize` — el export trae todo lo filtrado.
 */
export async function* streamAuditLogsForExport(
  params: Omit<AuditListSearchParams, "page" | "pageSize">,
): AsyncGenerator<AuditLogListItem, void, unknown> {
  const where = buildAuditListWhere(params);
  const BATCH_SIZE = 200;
  let cursorId: string | undefined;

  while (true) {
    const batch: AuditLogListItem[] = await prisma.auditLog.findMany({
      where,
      select: LIST_SELECT,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: BATCH_SIZE,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });
    if (batch.length === 0) break;
    for (const item of batch) yield item;
    if (batch.length < BATCH_SIZE) break;
    cursorId = batch[batch.length - 1]!.id;
  }
}
