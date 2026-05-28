import Link from "next/link";

import { ArrowRight, FilePlus, FileText } from "lucide-react";

export function QuickActions() {
  return (
    <section
      aria-labelledby="quick-actions-heading"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <h2 id="quick-actions-heading" className="sr-only">
        Acciones rápidas
      </h2>

      <Link
        href="/constancias/nueva"
        className="group bg-primary text-primary-foreground hover:bg-primary/95 focus-visible:ring-ring relative overflow-hidden rounded-lg p-5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:col-span-2 lg:col-span-1"
      >
        <span
          aria-hidden
          className="absolute top-4 right-4 size-2 rotate-45 rounded-[2px] bg-[var(--color-seal)]"
        />
        <span className="bg-primary-foreground/15 mb-4 inline-flex size-9 items-center justify-center rounded-md">
          <FilePlus className="size-4" aria-hidden />
        </span>
        <h3 className="font-display text-xl leading-tight font-semibold">
          Emitir nueva
          <br />
          constancia
        </h3>
        <p className="text-primary-foreground/75 mt-1.5 text-sm">
          3 campos. Folio automático. PDF listo para impresión.
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
          Comenzar
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </Link>

      <Link
        href="/constancias"
        className="group bg-card border-border hover:border-primary/40 focus-visible:ring-ring relative rounded-lg border p-5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <span className="bg-muted text-foreground mb-4 inline-flex size-9 items-center justify-center rounded-md">
          <FileText className="size-4" aria-hidden />
        </span>
        <h3 className="font-display text-lg leading-tight font-semibold">Buscar constancia</h3>
        <p className="text-muted-foreground mt-1.5 text-sm">Por folio, DNI o solicitante.</p>
        <span className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
          Abrir listado
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </Link>
    </section>
  );
}
