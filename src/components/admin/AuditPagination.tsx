"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { useListParamsUpdater } from "@/components/constancias/use-list-params";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

const PAGE_SIZES = ["10", "25", "50", "100"];

export function AuditPagination({ page, totalPages, total, pageSize }: AuditPaginationProps) {
  const { updateParam, updateMany } = useListParamsUpdater();

  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  function go(newPage: number) {
    updateParam("page", String(Math.max(1, Math.min(totalPages, newPage))));
  }

  return (
    <div
      data-testid="audit-pagination"
      className="border-border text-muted-foreground flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-xs sm:flex-row"
    >
      <p data-testid="audit-pagination-summary">
        Mostrando <span className="text-foreground font-medium">{first}</span>–
        <span className="text-foreground font-medium">{last}</span> de{" "}
        <span className="text-foreground font-medium">{total}</span> registros
      </p>

      <div className="flex items-center gap-3">
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => go(1)}
              disabled={page <= 1}
              aria-label="Primera página"
              data-testid="audit-page-first"
            >
              <ChevronsLeft className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => go(page - 1)}
              disabled={page <= 1}
              aria-label="Página anterior"
              data-testid="audit-page-prev"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="px-2 text-xs">
              Página <span className="text-foreground font-medium">{page}</span> de{" "}
              <span className="text-foreground font-medium">{totalPages}</span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => go(page + 1)}
              disabled={page >= totalPages}
              aria-label="Página siguiente"
              data-testid="audit-page-next"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => go(totalPages)}
              disabled={page >= totalPages}
              aria-label="Última página"
              data-testid="audit-page-last"
            >
              <ChevronsRight className="size-4" aria-hidden />
            </Button>
          </div>
        )}

        <Select
          value={String(pageSize)}
          onValueChange={(v) => updateMany({ pageSize: v ?? undefined, page: "1" })}
        >
          <SelectTrigger className="h-8 w-[80px]" data-testid="audit-page-size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
