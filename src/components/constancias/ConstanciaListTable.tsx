"use client";

import Link from "next/link";

import { type ConstanciaType, type Role } from "@prisma/client";
import { ChevronDown, ChevronUp, Download, Eye } from "lucide-react";

import { useListParamsUpdater } from "@/components/constancias/use-list-params";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDateHN } from "@/lib/utils/format";
import {
  type ConstanciaSortField,
  type ConstanciaListSearchParams,
} from "@/lib/validators/constancia-list";
import { type ConstanciaListItem } from "@/server/services/constancia-list.service";

interface ConstanciaListTableProps {
  items: ConstanciaListItem[];
  userRole: Role;
  currentSort: ConstanciaSortField;
  currentDir: "asc" | "desc";
  hasFiltersActive: boolean;
  pageSize: ConstanciaListSearchParams["pageSize"];
}

const TYPE_BADGE: Record<ConstanciaType, "default" | "secondary" | "destructive"> = {
  CVD: "secondary",
  CVP: "default",
  CVE: "destructive",
};

interface SortableHeaderProps {
  field: ConstanciaSortField;
  label: string;
  currentSort: ConstanciaSortField;
  currentDir: "asc" | "desc";
  align?: "left" | "right";
}

function SortableHeader({
  field,
  label,
  currentSort,
  currentDir,
  align = "left",
}: SortableHeaderProps) {
  const { updateMany } = useListParamsUpdater();
  const active = currentSort === field;
  const nextDir = active && currentDir === "desc" ? "asc" : "desc";

  return (
    <button
      type="button"
      onClick={() => updateMany({ sort: field, dir: nextDir })}
      data-testid={`sort-${field}`}
      className={cn(
        "group inline-flex items-center gap-1 text-[0.65rem] font-medium tracking-[0.14em] uppercase transition-colors outline-none",
        "focus-visible:ring-ring rounded focus-visible:ring-2 focus-visible:ring-offset-2",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        align === "right" && "justify-end",
      )}
    >
      {label}
      {active &&
        (currentDir === "asc" ? (
          <ChevronUp className="size-3" aria-hidden />
        ) : (
          <ChevronDown className="size-3" aria-hidden />
        ))}
    </button>
  );
}

export function ConstanciaListTable({
  items,
  userRole,
  currentSort,
  currentDir,
  hasFiltersActive,
  pageSize,
}: ConstanciaListTableProps) {
  const { clearAll } = useListParamsUpdater();
  void pageSize;

  if (items.length === 0) {
    return (
      <div
        data-testid="list-empty"
        className="border-border bg-card flex flex-col items-center justify-center gap-3 rounded-lg border px-4 py-16 text-center"
      >
        <p className="font-display text-lg">
          {hasFiltersActive
            ? "Sin resultados con los filtros aplicados"
            : "Aún no hay constancias emitidas"}
        </p>
        <p className="text-muted-foreground max-w-sm text-sm">
          {hasFiltersActive
            ? "Prueba ajustando los filtros o limpiándolos para ver todo el registro."
            : "Cuando se emita la primera constancia aparecerá aquí."}
        </p>
        {hasFiltersActive && (
          <button
            type="button"
            onClick={clearAll}
            data-testid="empty-clear"
            className="text-primary text-sm font-medium hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border-border bg-card w-full max-w-full overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-border border-b">
          <tr>
            <th scope="col" className="px-4 py-2.5 text-left">
              <SortableHeader
                field="folio"
                label="Folio"
                currentSort={currentSort}
                currentDir={currentDir}
              />
            </th>
            <th
              scope="col"
              className="text-muted-foreground px-4 py-2.5 text-left text-[0.65rem] font-medium tracking-[0.14em] uppercase"
            >
              Tipo
            </th>
            <th scope="col" className="px-4 py-2.5 text-left">
              <SortableHeader
                field="applicantFullName"
                label="Solicitante"
                currentSort={currentSort}
                currentDir={currentDir}
              />
            </th>
            <th
              scope="col"
              className="text-muted-foreground px-4 py-2.5 text-left text-[0.65rem] font-medium tracking-[0.14em] uppercase"
            >
              Identidad
            </th>
            <th scope="col" className="px-4 py-2.5 text-left">
              <SortableHeader
                field="issuedAt"
                label="Fecha"
                currentSort={currentSort}
                currentDir={currentDir}
              />
            </th>
            <th
              scope="col"
              className="text-muted-foreground px-4 py-2.5 text-left text-[0.65rem] font-medium tracking-[0.14em] uppercase"
            >
              Emitido por
            </th>
            <th
              scope="col"
              className="text-muted-foreground px-4 py-2.5 text-left text-[0.65rem] font-medium tracking-[0.14em] uppercase"
            >
              Estado
            </th>
            <th scope="col" className="sr-only px-2">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {items.map((c) => (
            <tr
              key={c.id}
              data-testid="list-row"
              data-row-id={c.id}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/constancias/${c.id}`}
                  className="text-foreground hover:text-primary font-mono text-sm font-medium tracking-wide"
                >
                  {c.folioNumber}-{c.folioYear}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge variant={TYPE_BADGE[c.type]}>{c.type}</Badge>
              </td>
              <td className="max-w-[220px] truncate px-4 py-3" title={c.applicantFullName}>
                {c.applicantFullName}
              </td>
              <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                {c.applicantIdNumber}
              </td>
              <td className="text-muted-foreground px-4 py-3 text-sm">
                {formatDateHN(c.issuedAt)}
              </td>
              <td className="text-muted-foreground max-w-[180px] truncate px-4 py-3 text-sm">
                {c.issuedBy.fullName}
              </td>
              <td className="px-4 py-3">
                <Badge variant={c.status === "ACTIVE" ? "secondary" : "destructive"}>
                  {c.status === "ACTIVE" ? "Activa" : "Anulada"}
                </Badge>
              </td>
              <td className="px-2 py-3 text-right">
                <RowActions id={c.id} folio={c.folio} status={c.status} userRole={userRole} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface RowActionsProps {
  id: string;
  folio: string;
  status: "ACTIVE" | "ANNULLED";
  userRole: Role;
}

function RowActions({ id, folio, userRole, status }: RowActionsProps) {
  void status;
  void userRole;
  // Anular se hace desde el detalle (modal con motivo); aquí ofrecemos
  // "Ver" y "Descargar PDF" como atajos.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            data-testid={`row-actions-${id}`}
            className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            aria-label={`Acciones para ${folio}`}
          >
            ⋯
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem render={<Link href={`/constancias/${id}`} />} className="cursor-pointer">
          <Eye className="size-3.5" aria-hidden />
          Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <a href={`/api/constancias/${id}/pdf`} target="_blank" rel="noopener noreferrer" />
          }
          className="cursor-pointer"
        >
          <Download className="size-3.5" aria-hidden />
          Descargar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
