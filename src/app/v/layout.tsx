// Layout independiente del dashboard. Hereda el ThemeProvider del root.
// NO importar componentes del shell (sidebar, header), NO requireAuth.
// Mantenerlo delgado para que cargue rápido en mobile.

import Image from "next/image";

export default function PublicVerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-svh flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <span className="bg-primary/5 ring-primary/10 relative grid size-10 shrink-0 place-items-center rounded-md p-1 ring-1">
            <Image
              src="/amdc_original.png"
              alt=""
              width={32}
              height={32}
              priority
              className="object-contain"
            />
            <span
              className="absolute -top-1 -right-1 size-2 rotate-45 rounded-[2px] bg-[var(--color-seal)]"
              aria-hidden
            />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-display truncate text-base font-semibold">Secretaría Municipal</p>
            <p className="text-muted-foreground truncate text-[0.7rem] tracking-[0.18em] uppercase">
              Distrito Central
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:py-12">{children}</main>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto max-w-3xl space-y-1 px-4 py-6 text-center text-xs">
          <p>
            Esta página confirma la autenticidad del documento físico emitido por la Secretaría
            Municipal del Distrito Central, Tegucigalpa, Honduras.
          </p>
          <p>Para reportar irregularidades, comuníquese con la Alcaldía Municipal.</p>
        </div>
      </footer>
    </div>
  );
}
