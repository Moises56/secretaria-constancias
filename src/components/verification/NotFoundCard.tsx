import { CircleHelp } from "lucide-react";

export function NotFoundCard() {
  return (
    <div className="space-y-6" data-testid="status-notfound">
      <section className="flex items-start gap-4 rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-5 sm:p-6">
        <CircleHelp
          className="size-10 shrink-0 text-amber-600 sm:size-12 dark:text-amber-400"
          aria-hidden
        />
        <div className="min-w-0">
          <h1 className="font-display text-foreground text-xl leading-tight tracking-tight sm:text-2xl">
            Constancia no encontrada
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Este código de verificación no corresponde a una constancia emitida por la Secretaría
            Municipal.
          </p>
        </div>
      </section>

      <section className="border-border bg-card space-y-3 rounded-lg border p-5 text-sm leading-relaxed sm:p-6">
        <p className="font-medium">Si el documento físico parece auténtico:</p>
        <ul className="text-muted-foreground list-disc space-y-2 pl-5">
          <li>Verifique que escaneó el código QR completo, sin recortes ni reflejos.</li>
          <li>Confirme que el documento es original y no una fotocopia con QR alterado.</li>
          <li>
            Comuníquese con la Alcaldía Municipal del Distrito Central para confirmar la validez.
          </li>
        </ul>
      </section>

      <div className="seal-rule" aria-hidden>
        <span className="seal-rule__diamond" />
      </div>
    </div>
  );
}
