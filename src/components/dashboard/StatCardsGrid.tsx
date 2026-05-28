"use client";

import { useEffect, useRef, useState } from "react";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import { usePrefersReducedMotion } from "@/lib/utils/use-reduced-motion";

interface StatCardsGridProps {
  children: React.ReactNode;
}

/**
 * Grid container que aplica stagger entrance a cada `[data-stat-card]`.
 * Respeta `prefers-reduced-motion`.
 *
 * IMPORTANTE — mounted guard:
 * `gsap.from()` setea sincrónicamente los valores iniciales en el `style`
 * del elemento (translate/rotate/scale + opacity:0). Si lo hacemos durante
 * la hidratación, React detecta mismatch entre el HTML del servidor (sin
 * esos estilos) y el del cliente (con ellos). Por eso esperamos al primer
 * commit con `mounted` antes de arrancar la animación.
 */
export function StatCardsGrid({ children }: StatCardsGridProps) {
  const container = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useGSAP(
    () => {
      if (reduce || !mounted) return;
      gsap.from("[data-stat-card]", {
        opacity: 0,
        y: 12,
        duration: 0.45,
        stagger: 0.07,
        ease: "power2.out",
      });
    },
    { scope: container, dependencies: [reduce, mounted] },
  );

  return (
    <div ref={container} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}
