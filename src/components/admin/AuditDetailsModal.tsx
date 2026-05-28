"use client";

import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { auditActionLabel } from "@/lib/audit-display";
import { type AuditLogListItem } from "@/server/services/audit-list.service";

interface AuditDetailsModalProps {
  log: AuditLogListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-[0.7rem] font-medium tracking-[0.14em] uppercase">
        {label}
      </dt>
      <dd className="text-sm break-words">{value}</dd>
    </div>
  );
}

export function AuditDetailsModal({ log, open, onOpenChange }: AuditDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="audit-details-modal">
        <DialogHeader>
          <DialogTitle>{log ? auditActionLabel(log.action) : "Detalle"}</DialogTitle>
          <DialogDescription>Registro de auditoría — solo lectura (append-only).</DialogDescription>
        </DialogHeader>

        {log && (
          <div className="flex flex-col gap-3">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Fecha y hora" value={format(log.createdAt, "yyyy-MM-dd HH:mm:ss")} />
              <Field
                label="Usuario"
                value={
                  log.user ? `${log.user.fullName} (${log.user.username})` : "Sistema / Anónimo"
                }
              />
              <Field label="Acción" value={log.action} />
              <Field
                label="Entidad"
                value={
                  log.entity ? `${log.entity}${log.entityId ? ` · ${log.entityId}` : ""}` : "—"
                }
              />
              <Field label="IP" value={log.ipAddress ?? "—"} />
              <Field label="User-Agent" value={log.userAgent ?? "—"} />
            </dl>

            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-[0.7rem] font-medium tracking-[0.14em] uppercase">
                Metadata
              </span>
              <pre
                data-testid="audit-details-metadata"
                className="bg-muted max-h-72 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap"
              >
                {log.metadata ? JSON.stringify(log.metadata, null, 2) : "—"}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
