import { type ConstanciaType } from "@prisma/client";
import { CircleCheck, CircleX } from "lucide-react";

import { DataRow } from "@/components/verification/DataRow";
import { TYPE_LABEL } from "@/lib/constancia-template";
import { cn } from "@/lib/utils";
import { displayFolio, formatDateHN } from "@/lib/utils/format";
import { maskDni } from "@/lib/utils/mask-id";

interface VerificationCardProps {
  constancia: {
    folioNumber: number;
    folioYear: number;
    type: ConstanciaType;
    status: "ACTIVE" | "ANNULLED";
    applicantFullName: string;
    applicantIdNumber: string;
    signerName: string;
    signerTitleLine: string;
    issuedAt: Date;
    annulledAt: Date | null;
    annulledReason: string | null;
  };
}

export function VerificationCard({ constancia }: VerificationCardProps) {
  const isActive = constancia.status === "ACTIVE";

  return (
    <div className="space-y-6" data-testid="verification-card">
      {/* Status header */}
      <section
        data-testid={isActive ? "status-active" : "status-annulled"}
        className={cn(
          "flex items-start gap-4 rounded-lg border-2 p-5 sm:p-6",
          isActive
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100"
            : "border-destructive/40 bg-destructive/5 text-destructive",
        )}
      >
        {isActive ? (
          <CircleCheck className="size-10 shrink-0 sm:size-12" aria-hidden />
        ) : (
          <CircleX className="size-10 shrink-0 sm:size-12" aria-hidden />
        )}
        <div className="min-w-0">
          <h1 className="font-display text-xl leading-tight tracking-tight sm:text-2xl">
            {isActive ? "Constancia auténtica" : "Constancia anulada"}
          </h1>
          <p className="mt-1 text-sm opacity-85">
            {isActive
              ? "Documento válido emitido por la Secretaría Municipal."
              : "Este documento fue anulado y NO debe aceptarse como válido."}
          </p>
        </div>
      </section>

      {/* Banner de motivo solo si está anulada */}
      {!isActive && constancia.annulledReason && (
        <section
          data-testid="annul-reason"
          className="border-destructive/30 bg-destructive/5 rounded-md border p-4"
        >
          <p className="text-destructive text-[0.7rem] font-medium tracking-[0.18em] uppercase">
            Motivo de la anulación
          </p>
          <p className="mt-2 text-sm leading-relaxed">{constancia.annulledReason}</p>
          {constancia.annulledAt && (
            <p className="text-muted-foreground mt-2 text-xs">
              Anulada el {formatDateHN(constancia.annulledAt)}
            </p>
          )}
        </section>
      )}

      {/* Datos */}
      <section
        className={cn(
          "border-border bg-card space-y-4 rounded-lg border p-5 sm:p-6",
          !isActive && "opacity-70",
        )}
      >
        <DataRow
          label="Número de constancia"
          value={displayFolio(constancia)}
          mono
        />
        <DataRow label="Tipo" value={TYPE_LABEL[constancia.type]} />
        <DataRow label="Fecha de emisión" value={formatDateHN(constancia.issuedAt)} />
        <hr className="border-border" />
        <DataRow label="Solicitante" value={constancia.applicantFullName.toUpperCase()} />
        <DataRow
          label="Identidad"
          value={
            <span data-testid="masked-dni" className="font-mono">
              {maskDni(constancia.applicantIdNumber)}
            </span>
          }
        />
        <hr className="border-border" />
        <DataRow label="Firmante" value={constancia.signerName} />
        <DataRow label="Cargo" value={constancia.signerTitleLine} small />
      </section>

      <div className="seal-rule" aria-hidden>
        <span className="seal-rule__diamond" />
      </div>
    </div>
  );
}
