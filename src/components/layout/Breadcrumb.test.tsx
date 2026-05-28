import { describe, expect, it } from "vitest";

import { buildCrumbs } from "@/components/layout/Breadcrumb";

describe("buildCrumbs", () => {
  it("ruta raíz '/' devuelve solo Inicio como current", () => {
    const r = buildCrumbs("/");
    expect(r).toEqual([{ href: "/", label: "Inicio", current: true }]);
  });

  it("mapea segmentos conocidos al diccionario", () => {
    const r = buildCrumbs("/constancias/nueva");
    expect(r).toEqual([
      { href: "/", label: "Inicio", current: false },
      { href: "/constancias", label: "Constancias", current: false },
      { href: "/constancias/nueva", label: "Nueva", current: true },
    ]);
  });

  it("usa capitalize como fallback para segmentos no mapeados", () => {
    const r = buildCrumbs("/constancias/abc-123");
    expect(r[r.length - 1]?.label).toBe("Abc-123");
  });

  it("marca solo el último crumb como current", () => {
    const r = buildCrumbs("/admin/usuarios");
    const lastIdx = r.length - 1;
    r.forEach((c, i) => {
      expect(c.current).toBe(i === lastIdx);
    });
    expect(r[1]?.label).toBe("Administración");
    expect(r[2]?.label).toBe("Usuarios");
  });

  it("decodifica segmentos URL-encoded", () => {
    const r = buildCrumbs("/constancias/Mar%C3%ADa");
    expect(r[r.length - 1]?.label).toBe("María");
  });
});
