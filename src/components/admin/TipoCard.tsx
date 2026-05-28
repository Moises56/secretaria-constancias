import Link from "next/link";

import { type ConstanciaType } from "@prisma/client";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface TipoCardProps {
  type: ConstanciaType;
  label: string;
  description: string;
  verbForm: "fue" | "es";
  includeInternationalClause: boolean;
  signer: { fullName: string; titleLine: string } | null;
}

export function TipoCard({
  type,
  label,
  description,
  verbForm,
  includeInternationalClause,
  signer,
}: TipoCardProps) {
  return (
    <div data-testid={`tipo-card-${type}`} className="border-border bg-card rounded-lg border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-2xl font-semibold tracking-tight">{type}</div>
          <div className="font-display mt-1 text-sm font-medium">{label}</div>
        </div>
        <Badge variant="secondary" className="font-mono">
          verbo: {verbForm}
        </Badge>
      </div>

      <p className="text-muted-foreground mt-2 text-sm">{description}</p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-[0.7rem] font-medium tracking-[0.14em] uppercase">
            Cláusula internacional
          </dt>
          <dd className="mt-0.5">{includeInternationalClause ? "Sí" : "No"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-[0.7rem] font-medium tracking-[0.14em] uppercase">
            Firmante por defecto
          </dt>
          <dd className="mt-0.5">
            {signer ? (
              <span>
                {signer.fullName}{" "}
                <span className="text-muted-foreground">— {signer.titleLine}</span>
              </span>
            ) : (
              <span className="text-destructive font-medium">Sin firmante activo</span>
            )}
          </dd>
        </div>
      </dl>

      {!signer && (
        <div
          data-testid={`tipo-warning-${type}`}
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mt-4 flex items-start gap-2 rounded-md border p-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Estado inconsistente: este tipo no tiene firmante activo asignado. No se podrán emitir
            constancias <span className="font-mono">{type}</span> hasta asignar uno en{" "}
            <Link href="/admin/firmantes" className="underline">
              Firmantes
            </Link>
            .
          </span>
        </div>
      )}
    </div>
  );
}
