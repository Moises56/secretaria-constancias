// CSV streaming via ReadableStream para no acumular en memoria. Cursor
// pagination en streamConstanciasForExport. BOM UTF-8 al inicio para que
// Excel detecte el encoding correctamente.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { format } from "date-fns";
import Papa from "papaparse";

import { TYPE_LABEL } from "@/lib/constancia-template";
import { parseConstanciaListSearchParams } from "@/lib/validators/constancia-list";
import { auth } from "@/server/auth";
import { can } from "@/server/auth/permissions";
import { recordConstanciaExported } from "@/server/lib/audit";
import { logger } from "@/server/lib/logger";
import { checkExportRateLimit } from "@/server/lib/rate-limit";
import { streamConstanciasForExport } from "@/server/services/constancia-list.service";

interface CsvRow {
  Folio: string;
  Tipo: string;
  Solicitante: string;
  Identidad: string;
  PaperSerial: string;
  Firmante: string;
  FechaEmision: string;
  Estado: string;
  MotivoAnulacion: string;
  FechaAnulacion: string;
  EmitidoPor: string;
}

const CSV_FIELDS: (keyof CsvRow)[] = [
  "Folio",
  "Tipo",
  "Solicitante",
  "Identidad",
  "PaperSerial",
  "Firmante",
  "FechaEmision",
  "Estado",
  "MotivoAnulacion",
  "FechaAnulacion",
  "EmitidoPor",
];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!can(session.user.role, "CONSTANCIA_VIEW")) {
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
  const params = parseConstanciaListSearchParams(raw);
  const userId = session.user.id;
  const userRole = session.user.role;

  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm");
  const filename = `constancias_${timestamp}.csv`;

  const encoder = new TextEncoder();

  // Filtros sin page/pageSize para el snapshot del audit.
  const auditFilters = {
    q: params.q ?? null,
    type: params.type ?? null,
    status: params.status ?? null,
    from: params.from ?? null,
    to: params.to ?? null,
    issuedById: params.issuedById ?? null,
    sort: params.sort,
    dir: params.dir,
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let rowCount = 0;
      try {
        // BOM UTF-8 — Excel necesita esto para acentos correctos.
        controller.enqueue(encoder.encode("﻿"));
        // Cabecera del CSV — los nombres de columna no contienen comas ni
        // comillas, así que simple join es suficiente.
        controller.enqueue(encoder.encode(CSV_FIELDS.join(",") + "\r\n"));

        for await (const c of streamConstanciasForExport(params, userRole)) {
          const row: CsvRow = {
            Folio: c.folio,
            Tipo: TYPE_LABEL[c.type],
            Solicitante: c.applicantFullName,
            Identidad: c.applicantIdNumber,
            PaperSerial: c.paperSerial ?? "",
            Firmante: c.signerName,
            FechaEmision: format(c.issuedAt, "yyyy-MM-dd HH:mm"),
            Estado: c.status === "ACTIVE" ? "Activa" : "Anulada",
            MotivoAnulacion: c.annulledReason ?? "",
            FechaAnulacion: c.annulledAt ? format(c.annulledAt, "yyyy-MM-dd HH:mm") : "",
            EmitidoPor: c.issuedBy.fullName,
          };
          const line = Papa.unparse([row], { columns: CSV_FIELDS, header: false });
          controller.enqueue(encoder.encode(line + "\r\n"));
          rowCount++;
        }

        controller.close();

        // AuditLog se hace después del stream para tener el conteo real.
        try {
          await recordConstanciaExported({ userId, filters: auditFilters, rowCount });
        } catch (auditErr) {
          logger.error({ err: auditErr, userId }, "Failed to record CSV export audit");
        }
      } catch (err) {
        logger.error({ err, userId }, "CSV export stream failed");
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
