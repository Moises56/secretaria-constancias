// @vitest-environment node
import { describe, expect, it } from "vitest";

import { INTL_CLAUSE, renderConstanciaText, type RenderData } from "@/lib/constancia-template";

const baseFixture: RenderData = {
  folioNumber: 215,
  folioYear: 2026,
  fullName: "Héctor Miguel Zelaya González",
  idNumber: "0801-1942-02078",
  type: "CVD",
  issuedAt: new Date(2026, 4, 7),
  signerName: "Diana Alejandra Cruz Rivera",
  signerTitleLine: "Acuerdo de Delegación N.001 AMDC-SM-2026",
};

describe("renderConstanciaText", () => {
  it("CVD usa 'fue' y NO incluye la cláusula internacional", () => {
    const t = renderConstanciaText(baseFixture);
    expect(t).toContain("fue vecino (a)");
    expect(t).not.toContain(INTL_CLAUSE);
    expect(t).toContain("HÉCTOR MIGUEL ZELAYA GONZÁLEZ");
    expect(t).toContain("CONSTANCIA DE VECINDAD N. 215-2026");
    expect(t).toContain("a los siete días del mes de mayo del año dos mil veintiséis");
    expect(t).toMatchSnapshot();
  });

  it("CVP usa 'es' sin cláusula internacional", () => {
    const t = renderConstanciaText({
      ...baseFixture,
      type: "CVP",
      folioNumber: 2396,
      fullName: "María Fernanda López Rodríguez",
      idNumber: "0801-1990-12345",
      issuedAt: new Date(2026, 4, 21),
    });
    expect(t).toContain("es vecino (a)");
    expect(t).not.toContain("República de Honduras");
    expect(t).toContain("a los veintiuno días del mes de mayo del año dos mil veintiséis");
    expect(t).toMatchSnapshot();
  });

  it("CVE incluye la cláusula internacional ANTES del punto final", () => {
    const t = renderConstanciaText({
      ...baseFixture,
      type: "CVE",
      folioNumber: 2366,
      fullName: "Ángela Judith García Nolasco",
      idNumber: "0801-1997-11539",
      issuedAt: new Date(2026, 4, 20),
      signerName: "César Antonio Pinto Pacheco",
      signerTitleLine: "Secretario Municipal del Distrito Central",
    });
    expect(t).toContain("es vecino (a)");
    expect(t).toContain("departamento de Francisco Morazán, República de Honduras, Centroamérica.");
    // No debe haber espacio extra ni doble punto
    expect(t).not.toContain("Centroamérica..");
    expect(t).toContain("a los veinte días del mes de mayo");
    expect(t).toMatchSnapshot();
  });

  it("rinde el folio sin prefijo del tipo (eso solo está en BD)", () => {
    const t = renderConstanciaText({ ...baseFixture, type: "CVE", folioNumber: 2366 });
    expect(t).toContain("CONSTANCIA DE VECINDAD N. 2366-2026");
    expect(t).not.toContain("CVE-2366");
  });

  it("uppercase del nombre se aplica sólo en el render, no muta el input", () => {
    const data: RenderData = { ...baseFixture, fullName: "juan pérez muñoz" };
    const before = data.fullName;
    renderConstanciaText(data);
    expect(data.fullName).toBe(before);
  });
});
