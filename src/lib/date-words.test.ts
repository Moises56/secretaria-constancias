// @vitest-environment node
import { describe, expect, it } from "vitest";

import { dateInWords, dayToWords, monthToWords, yearToWords } from "@/lib/date-words";

describe("dayToWords", () => {
  it.each([
    [1, "uno"],
    [7, "siete"],
    [11, "once"],
    [15, "quince"],
    [16, "dieciséis"],
    [20, "veinte"],
    [21, "veintiuno"],
    [22, "veintidós"],
    [28, "veintiocho"],
    [30, "treinta"],
    [31, "treinta y uno"],
  ])("día %i → %s", (day, expected) => {
    expect(dayToWords(day)).toBe(expected);
  });

  it("lanza para 0, 32, no entero", () => {
    expect(() => dayToWords(0)).toThrow(RangeError);
    expect(() => dayToWords(32)).toThrow(RangeError);
    expect(() => dayToWords(1.5)).toThrow(RangeError);
    expect(() => dayToWords(-3)).toThrow(RangeError);
  });
});

describe("monthToWords (índice 0-based)", () => {
  it.each([
    [0, "enero"],
    [4, "mayo"],
    [5, "junio"],
    [8, "septiembre"],
    [11, "diciembre"],
  ])("mes %i → %s", (m, expected) => {
    expect(monthToWords(m)).toBe(expected);
  });

  it("lanza para -1 y 12", () => {
    expect(() => monthToWords(-1)).toThrow(RangeError);
    expect(() => monthToWords(12)).toThrow(RangeError);
  });
});

describe("yearToWords", () => {
  it.each([
    [2000, "dos mil"],
    [2001, "dos mil uno"],
    [2024, "dos mil veinticuatro"],
    [2025, "dos mil veinticinco"],
    [2026, "dos mil veintiséis"],
    [2027, "dos mil veintisiete"],
    [2029, "dos mil veintinueve"],
  ])("año %i → %s", (y, expected) => {
    expect(yearToWords(y)).toBe(expected);
  });

  it("rechaza años fuera de rango con mensaje explicativo", () => {
    expect(() => yearToWords(1999)).toThrow(/fuera del rango/);
    expect(() => yearToWords(2030)).toThrow(/fuera del rango|Ampliar el rango/);
    expect(() => yearToWords(2050)).toThrow(RangeError);
  });

  it("rechaza años no enteros", () => {
    expect(() => yearToWords(2026.5)).toThrow(RangeError);
  });
});

describe("dateInWords — casos exactos de los .docx reales", () => {
  it("7 de mayo de 2026", () => {
    expect(dateInWords(new Date(2026, 4, 7))).toEqual({
      day: "siete",
      month: "mayo",
      year: "dos mil veintiséis",
    });
  });

  it("11 de mayo de 2026", () => {
    expect(dateInWords(new Date(2026, 4, 11))).toEqual({
      day: "once",
      month: "mayo",
      year: "dos mil veintiséis",
    });
  });

  it("20 de mayo de 2026", () => {
    expect(dateInWords(new Date(2026, 4, 20))).toEqual({
      day: "veinte",
      month: "mayo",
      year: "dos mil veintiséis",
    });
  });

  it("21 de mayo de 2026", () => {
    expect(dateInWords(new Date(2026, 4, 21))).toEqual({
      day: "veintiuno",
      month: "mayo",
      year: "dos mil veintiséis",
    });
  });
});
