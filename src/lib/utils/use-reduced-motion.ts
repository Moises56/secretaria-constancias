"use client";

import { useEffect, useState } from "react";

/**
 * Devuelve `true` si el usuario tiene `prefers-reduced-motion: reduce` activo
 * en el SO o el navegador. Toda animación NO esencial debe consultar este
 * hook y skipear cuando retorne true.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // El SSR no conoce la media query; debemos setear el valor real DESPUÉS
    // de la hidratación para evitar mismatch. Patrón canónico — mismo que
    // `mounted` guard en ThemeToggle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefers(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefers;
}
