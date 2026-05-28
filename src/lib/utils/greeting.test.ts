import { describe, expect, it } from "vitest";

import { greetingForHour } from "./greeting";

// Helper: construye un Date en la zona horaria de Tegucigalpa (UTC-6, sin DST).
// Pasando el offset explícito evitamos depender del TZ del host que corre los tests.
function tegusDateAt(hour: number, minute = 0): Date {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`2026-05-28T${hh}:${mm}:00-06:00`);
}

describe("greetingForHour", () => {
  it("devuelve 'Buenos días' a las 05:00 (límite inferior de mañana)", () => {
    expect(greetingForHour(tegusDateAt(5, 0))).toBe("Buenos días");
  });

  it("devuelve 'Buenos días' a las 08:30 (medio mañana)", () => {
    expect(greetingForHour(tegusDateAt(8, 30))).toBe("Buenos días");
  });

  it("devuelve 'Buenos días' a las 11:59 (último minuto de mañana)", () => {
    expect(greetingForHour(tegusDateAt(11, 59))).toBe("Buenos días");
  });

  it("devuelve 'Buenas tardes' a las 12:00 (límite inferior de tarde)", () => {
    expect(greetingForHour(tegusDateAt(12, 0))).toBe("Buenas tardes");
  });

  it("devuelve 'Buenas tardes' a las 15:00 (media tarde)", () => {
    expect(greetingForHour(tegusDateAt(15, 0))).toBe("Buenas tardes");
  });

  it("devuelve 'Buenas tardes' a las 17:59 (último minuto de tarde)", () => {
    expect(greetingForHour(tegusDateAt(17, 59))).toBe("Buenas tardes");
  });

  it("devuelve 'Buenas noches' a las 18:00 (límite inferior de noche)", () => {
    expect(greetingForHour(tegusDateAt(18, 0))).toBe("Buenas noches");
  });

  it("devuelve 'Buenas noches' a las 22:30 (noche)", () => {
    expect(greetingForHour(tegusDateAt(22, 30))).toBe("Buenas noches");
  });

  it("devuelve 'Buenas noches' a medianoche (00:00)", () => {
    expect(greetingForHour(tegusDateAt(0, 0))).toBe("Buenas noches");
  });

  it("devuelve 'Buenas noches' a las 04:59 (último minuto antes de mañana)", () => {
    expect(greetingForHour(tegusDateAt(4, 59))).toBe("Buenas noches");
  });

  it("usa la hora actual cuando no se pasa argumento", () => {
    // No verificamos el valor exacto (depende de cuándo corre el test);
    // sólo que devuelve un saludo válido.
    expect(["Buenos días", "Buenas tardes", "Buenas noches"]).toContain(greetingForHour());
  });
});
