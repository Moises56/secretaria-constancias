import { type ConstanciaType } from "@prisma/client";

import { SignerRowActions } from "@/components/admin/SignerRowActions";
import { Badge } from "@/components/ui/badge";

export interface SignerRow {
  id: string;
  fullName: string;
  titleLine: string;
  defaultForTypes: ConstanciaType[];
  isActive: boolean;
}

interface SignerTableProps {
  signers: SignerRow[];
}

export function SignerTable({ signers }: SignerTableProps) {
  if (signers.length === 0) {
    return (
      <div
        data-testid="signers-empty"
        className="border-border bg-card flex flex-col items-center justify-center gap-2 rounded-lg border px-4 py-16 text-center"
      >
        <p className="font-display text-lg">Aún no hay firmantes registrados</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Cree el primer firmante para poder emitir constancias.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card w-full max-w-full overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-border border-b">
          <tr className="text-muted-foreground text-left text-[0.65rem] font-medium tracking-[0.14em] uppercase">
            <th scope="col" className="px-4 py-2.5">
              Nombre
            </th>
            <th scope="col" className="px-4 py-2.5">
              Cargo
            </th>
            <th scope="col" className="px-4 py-2.5">
              Tipos
            </th>
            <th scope="col" className="px-4 py-2.5">
              Estado
            </th>
            <th scope="col" className="sr-only px-2">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {signers.map((s) => (
            <tr
              key={s.id}
              data-testid="signer-row"
              data-row-id={s.id}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3">
                <span className="font-display font-medium">{s.fullName}</span>
              </td>
              <td
                className="text-muted-foreground max-w-[280px] truncate px-4 py-3"
                title={s.titleLine}
              >
                {s.titleLine}
              </td>
              <td className="px-4 py-3">
                <span className="flex flex-wrap gap-1">
                  {s.defaultForTypes.length === 0 ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : (
                    s.defaultForTypes.map((t) => (
                      <Badge key={t} variant="secondary" className="font-mono">
                        {t}
                      </Badge>
                    ))
                  )}
                </span>
              </td>
              <td className="px-4 py-3">
                {s.isActive ? (
                  <Badge variant="default">Activo</Badge>
                ) : (
                  <Badge variant="secondary" className="opacity-70">
                    Inactivo
                  </Badge>
                )}
              </td>
              <td className="px-2 py-3 text-right">
                <SignerRowActions id={s.id} fullName={s.fullName} isActive={s.isActive} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
