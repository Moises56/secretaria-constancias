import { describe, expect, it } from "vitest";

import { sanitizeForPdf } from "@/lib/utils/sanitize";

describe("sanitizeForPdf", () => {
  it("elimina caracteres de control C0 y DEL", () => {
    expect(sanitizeForPdf("Ana\x00\x1F Pérez\x7F")).toBe("Ana Pérez");
  });

  it("preserva texto normal con tildes, ñ y puntuación", () => {
    expect(sanitizeForPdf("José Ángel O'Connor-Núñez")).toBe("José Ángel O'Connor-Núñez");
  });

  it("elimina saltos de línea y tabs (control en campos de una línea)", () => {
    expect(sanitizeForPdf("a\n\tb")).toBe("ab");
  });

  it("no altera una string ya limpia", () => {
    expect(sanitizeForPdf("CVE-2366-2026")).toBe("CVE-2366-2026");
  });
});
