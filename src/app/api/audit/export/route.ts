import { format } from "date-fns";
import Papa from "papaparse";

import { auditActionLabel } from "@/lib/audit-display";
import { parseAuditListSearchParams } from "@/lib/validators/audit";
import { auth } from "@/server/auth";
import { can } from "@/server/auth/permissions";
import { type ExportFiltersSnapshot, recordAuditExported } from "@/server/lib/audit";
import { logger } from "@/server/lib/logger";
import { checkExportRateLimit } from "@/server/lib/rate-limit";
import { streamAuditLogsForExport } from "@/server/services/audit-list.service";

// CSV streaming via ReadableStream (cursor pagination en el service). BOM UTF-8
// al inicio para que Excel detecte el encoding.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CsvRow {
  Fecha: string;
  Usuario: string;
  Username: string;
  Accion: string;
  Entidad: string;
  EntidadId: string;
  IP: string;
  UserAgent: string;
  Metadata: string;
}

const CSV_FIELDS: (keyof CsvRow)[] = [
  "Fecha",
  "Usuario",
  "Username",
  "Accion",
  "Entidad",
  "EntidadId",
  "IP",
  "UserAgent",
  "Metadata",
];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!can(session.user.role, "AUDIT_VIEW")) {
    return new Response("Forbidden", { status: 403 });
  }

  const rl = await checkExportRateLimit(session.user.id);
  if (rl.blocked) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
    });
  }

  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const params = parseAuditListSearchParams(raw);
  const userId = session.user.id;

  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm");
  const filename = `auditoria_${timestamp}.csv`;
  const encoder = new TextEncoder();

  // Snapshot de filtros sin page/pageSize para el meta-audit.
  const auditFilters: ExportFiltersSnapshot = {
    action: params.action ?? null,
    userId: params.userId ?? null,
    entity: params.entity ?? null,
    from: params.from ?? null,
    to: params.to ?? null,
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let rowCount = 0;
      try {
        controller.enqueue(encoder.encode("﻿"));
        controller.enqueue(encoder.encode(CSV_FIELDS.join(",") + "\r\n"));

        for await (const log of streamAuditLogsForExport(params)) {
          const row: CsvRow = {
            Fecha: format(log.createdAt, "yyyy-MM-dd HH:mm:ss"),
            Usuario: log.user?.fullName ?? "Sistema/Anónimo",
            Username: log.user?.username ?? "",
            Accion: auditActionLabel(log.action),
            Entidad: log.entity ?? "",
            EntidadId: log.entityId ?? "",
            IP: log.ipAddress ?? "",
            UserAgent: log.userAgent ?? "",
            Metadata: log.metadata ? JSON.stringify(log.metadata) : "",
          };
          const line = Papa.unparse([row], { columns: CSV_FIELDS, header: false });
          controller.enqueue(encoder.encode(line + "\r\n"));
          rowCount++;
        }

        // META-AUDIT: registrar AUDIT_EXPORTED ANTES de cerrar el stream. Así el
        // INSERT queda comprometido antes de terminar la respuesta HTTP y
        // aparece en el siguiente refresh de /admin/auditoria. Previene que un
        // admin exfiltre el log sin dejar rastro.
        try {
          await recordAuditExported({ userId, filters: auditFilters, rowCount });
        } catch (auditErr) {
          logger.error({ err: auditErr, userId }, "Failed to record audit export meta-audit");
        }

        controller.close();
      } catch (err) {
        logger.error({ err, userId }, "Audit CSV export stream failed");
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
