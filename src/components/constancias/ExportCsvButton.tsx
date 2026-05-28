"use client";

import { useTransition } from "react";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { type ConstanciaListSearchParams } from "@/lib/validators/constancia-list";

interface ExportCsvButtonProps {
  currentParams: ConstanciaListSearchParams;
}

const EXPORT_KEYS: (keyof ConstanciaListSearchParams)[] = [
  "q",
  "type",
  "status",
  "from",
  "to",
  "issuedById",
  "sort",
  "dir",
];

export function ExportCsvButton({ currentParams }: ExportCsvButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    const params = new URLSearchParams();
    for (const key of EXPORT_KEYS) {
      const value = currentParams[key];
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }

    startTransition(() => {
      // Navegación directa: dispara la descarga del browser sin saltar a una
      // página (el servidor responde con Content-Disposition: attachment).
      window.location.href = `/api/constancias/export?${params.toString()}`;
      toast.success("Descargando archivo CSV…");
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleExport}
      disabled={isPending}
      data-testid="export-csv"
    >
      <Download className="size-4" aria-hidden />
      {isPending ? "Preparando…" : "Exportar CSV"}
    </Button>
  );
}
