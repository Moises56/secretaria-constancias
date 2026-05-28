"use client";

import { useState } from "react";

import { format } from "date-fns";
import { Info } from "lucide-react";

import { AuditDetailsModal } from "@/components/admin/AuditDetailsModal";
import { AUDIT_CATEGORY_BADGE, auditActionCategory, auditActionLabel } from "@/lib/audit-display";
import { cn } from "@/lib/utils";
import { type AuditLogListItem } from "@/server/services/audit-list.service";

interface AuditTableProps {
  items: AuditLogListItem[];
  hasFiltersActive: boolean;
}

export function AuditTable({ items, hasFiltersActive }: AuditTableProps) {
  const [selected, setSelected] = useState<AuditLogListItem | null>(null);

  if (items.length === 0) {
    return (
      <div
        data-testid="audit-empty"
        className="border-border bg-card flex flex-col items-center justify-center gap-2 rounded-lg border px-4 py-16 text-center"
      >
        <p className="font-display text-lg">
          {hasFiltersActive
            ? "Sin registros con los filtros aplicados"
            : "Aún no hay registros de auditoría"}
        </p>
        <p className="text-muted-foreground max-w-sm text-sm">
          {hasFiltersActive
            ? "Ajusta o limpia los filtros para ver más actividad."
            : "La actividad del sistema aparecerá aquí."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-border bg-card overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-border border-b">
            <tr className="text-muted-foreground text-left text-[0.65rem] font-medium tracking-[0.14em] uppercase">
              <th scope="col" className="px-4 py-2.5">
                Fecha y hora
              </th>
              <th scope="col" className="px-4 py-2.5">
                Usuario
              </th>
              <th scope="col" className="px-4 py-2.5">
                Acción
              </th>
              <th scope="col" className="px-4 py-2.5">
                Entidad
              </th>
              <th scope="col" className="px-4 py-2.5">
                IP
              </th>
              <th scope="col" className="sr-only px-2">
                Detalles
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {items.map((log) => {
              const category = auditActionCategory(log.action);
              return (
                <tr
                  key={log.id}
                  data-testid="audit-row"
                  data-action={log.action}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                    {format(log.createdAt, "yyyy-MM-dd HH:mm:ss")}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3">
                    {log.user ? (
                      log.user.fullName
                    ) : (
                      <span className="text-muted-foreground italic">Sistema / Anónimo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded px-1.5 py-0.5 text-xs font-medium",
                        AUDIT_CATEGORY_BADGE[category],
                      )}
                    >
                      {auditActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">{log.entity ?? "—"}</td>
                  <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                    {log.ipAddress ?? "—"}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(log)}
                      data-testid={`audit-details-${log.id}`}
                      className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                      aria-label="Ver detalles"
                    >
                      <Info className="size-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AuditDetailsModal
        log={selected}
        open={selected !== null}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      />
    </>
  );
}
