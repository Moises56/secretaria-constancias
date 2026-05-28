import Link from "next/link";

import { BarChart3, FilePlus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyDashboardStateProps {
  canCreate: boolean;
}

export function EmptyDashboardState({ canCreate }: EmptyDashboardStateProps) {
  return (
    <section
      data-testid="dashboard-empty"
      className="border-border bg-card flex flex-col items-center justify-center gap-4 rounded-lg border px-4 py-16 text-center"
    >
      <span className="bg-muted text-muted-foreground inline-flex size-12 items-center justify-center rounded-full">
        <BarChart3 className="size-6" aria-hidden />
      </span>
      <div className="max-w-sm space-y-1">
        <h2 className="font-display text-foreground text-lg leading-tight font-semibold">
          Sin constancias en este periodo
        </h2>
        <p className="text-muted-foreground text-sm">
          Cambia el rango de fechas para ver actividad pasada
          {canCreate ? " o emite una nueva constancia." : "."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/" data-testid="empty-reset-range" />}
        >
          <RotateCcw className="size-4" aria-hidden />
          Volver al rango por defecto
        </Button>
        {canCreate && (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/constancias/nueva" data-testid="empty-emit" />}
          >
            <FilePlus className="size-4" aria-hidden />
            Emitir constancia
          </Button>
        )}
      </div>
    </section>
  );
}
