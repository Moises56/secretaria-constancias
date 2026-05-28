import { describe, expect, it } from "vitest";

import { maskDni } from "@/lib/utils/mask-id";

describe("maskDni", () => {
  it("enmascara los primeros 3 dígitos del último grupo", () => {
    expect(maskDni("0801-1990-12345")).toBe("0801-1990-XXX45");
  });

  it("preserva el formato con ceros al inicio del último grupo", () => {
    expect(maskDni("0801-1990-00001")).toBe("0801-1990-XXX01");
  });

  it("retorna el input intacto si no se parece a un DNI", () => {
    expect(maskDni("invalido")).toBe("invalido");
  });

  it("retorna cadena vacía sin error", () => {
    expect(maskDni("")).toBe("");
  });

  it("retorna intacto si el último grupo no tiene 5 dígitos", () => {
    expect(maskDni("0801-1990-123")).toBe("0801-1990-123");
  });

  it("retorna intacto si los grupos no respetan la cantidad de partes", () => {
    expect(maskDni("0801-19-12345")).toBe("0801-19-12345");
    expect(maskDni("0801-1990-12345-extra")).toBe("0801-1990-12345-extra");
  });
});
