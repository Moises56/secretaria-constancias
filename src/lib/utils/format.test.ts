import { describe, expect, it } from "vitest";

import { formatDateHN, formatDateTimeHN } from "@/lib/utils/format";

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
