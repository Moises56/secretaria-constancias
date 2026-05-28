import Image from "next/image";
import Link from "next/link";

import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-4">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <Image
          src="/amdc_original.png"
          alt=""
          width={80}
          height={80}
          priority
          className="mx-auto opacity-60"
        />
        <div className="space-y-2">
          <p className="text-muted-foreground text-[0.7rem] font-medium tracking-[0.18em] uppercase">
            Error 404
          </p>
          <h1 className="font-display text-foreground text-3xl leading-tight tracking-tight">
            Página no encontrada
          </h1>
          <p className="text-muted-foreground text-sm">
            La sección que busca no existe o aún no está disponible en esta versión del sistema.
          </p>
        </div>
        <div className="seal-rule mx-auto max-w-xs" aria-hidden>
          <span className="seal-rule__diamond" />
        </div>
        <Button nativeButton={false} render={<Link href="/" data-testid="not-found-home" />}>
          <Home className="size-4" aria-hidden />
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
