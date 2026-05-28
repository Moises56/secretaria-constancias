"use client";

import { useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import { usePrefersReducedMotion } from "@/lib/utils/use-reduced-motion";

/**
 * Cliente sin DOM propio. Detecta `?new=1` y anima el `[data-folio]` de la
 * página con un scale-up suave (micro-celebración tras emisión).
 * No requiere ser hijo del elemento — usa selector global.
 *
 * Guard de mounted: `gsap.from()` setea sincrónicamente los valores
 * iniciales (scale 0.92, opacity 0) en el `style` del elemento. Si
 * corremos eso durante la hidratación, React detecta mismatch entre el
 * HTML del server (folio visible) y el del cliente (folio invisible).
 */
export function NewConstanciaHighlight() {
  const params = useSearchParams();
  const reduce = usePrefersReducedMotion();
  const isNew = params.get("new") === "1";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useGSAP(
    () => {
      if (reduce || !isNew || !mounted) return;
      // Solo `scale` — NO `opacity: 0`. El folio debe quedar visible siempre;
      // tests E2E con `toBeVisible()` fallan si momentáneamente está
      // transparente durante la animación.
      gsap.from("[data-folio]", {
        scale: 0.92,
        duration: 0.45,
        ease: "back.out(1.4)",
      });
    },
    { dependencies: [reduce, isNew, mounted] },
  );

  return null;
}
