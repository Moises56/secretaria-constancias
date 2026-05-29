import { describe, expect, it } from "vitest";

import { displayFolio, formatDateHN, formatDateTimeHN } from "@/lib/utils/format";

// 2026-05-27 12:00 UTC → en Tegucigalpa (UTC-6) = 27 de mayo de 2026, 06:00.
const D = new Date("2026-05-27T12:00:00.000Z");

describe("formatDateHN", () => {
  it("formatea en es-HN con mes en palabras y zona Tegucigalpa", () => {
    const out = formatDateHN(D);
    expect(out).toMatch(/27/);
    expect(out.toLowerCase()).toContain("mayo");
    expect(out).toMatch(/2026/);
  });
});

describe("formatDateTimeHN", () => {
  it("incluye fecha y hora", () => {
    const out = formatDateTimeHN(D);
    expect(out).toMatch(/27/);
    expect(out.toLowerCase()).toContain("mayo");
    expect(out).toMatch(/2026/);
    // hora presente (HH:MM)
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });

  it("respeta la zona de Tegucigalpa (UTC-6): 12:00 UTC → 06:00 local", () => {
    expect(formatDateTimeHN(D)).toMatch(/06:00/);
  });
});

describe("displayFolio", () => {
  it("CVD → 'N-CVD-AÑO'", () => {
    expect(displayFolio({ folioNumber: 1, type: "CVD", folioYear: 2026 })).toBe("1-CVD-2026");
  });

  it("CVP → 'N-CVP-AÑO'", () => {
    expect(displayFolio({ folioNumber: 42, type: "CVP", folioYear: 2026 })).toBe("42-CVP-2026");
  });

  it("CVE → 'N-CVE-AÑO'", () => {
    expect(displayFolio({ folioNumber: 999, type: "CVE", folioYear: 2026 })).toBe("999-CVE-2026");
  });

  it("usa el número entero tal cual, sin zero-padding", () => {
    expect(displayFolio({ folioNumber: 7, type: "CVP", folioYear: 2026 })).toBe("7-CVP-2026");
  });
});
