"use client";

import { useCallback } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Hook que centraliza la actualización de los query params del listado.
 * Convención: cuando cambia cualquier filtro distinto de `page`, se resetea
 * `page=1` automáticamente para evitar quedar en una página fuera de rango.
 */
export function useListParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === undefined || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      if (key !== "page") params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const updateMany = useCallback(
    (entries: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      let touchedNonPage = false;
      for (const [key, value] of Object.entries(entries)) {
        if (value === undefined || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
        if (key !== "page") touchedNonPage = true;
      }
      if (touchedNonPage) params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return { updateParam, updateMany, clearAll };
}
