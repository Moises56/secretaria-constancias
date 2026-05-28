"use client";

import { useTransition } from "react";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { type AuditListSearchParams } from "@/lib/validators/audit";

interface AuditExportButtonProps {
  currentParams: AuditListSearchParams;
}

const EXPORT_KEYS: (keyof AuditListSearchParams)[] = ["action", "userId", "entity", "from", "to"];

export function AuditExportButton({ currentParams }: AuditExportButtonProps) {
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
      window.location.href = `/api/audit/export?${params.toString()}`;
      toast.success("Descargando auditoría CSV…");
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleExport}
      disabled={isPending}
      data-testid="audit-export-csv"
    >
      <Download className="size-4" aria-hidden />
      {isPending ? "Preparando…" : "Exportar CSV"}
    </Button>
  );
}
