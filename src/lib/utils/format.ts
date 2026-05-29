import { type ConstanciaType } from "@prisma/client";

interface FolioParts {
  folioNumber: number;
  type: ConstanciaType;
  folioYear: number;
}

/**
 * Formato de display del folio para todas las vistas que ve el usuario
 * (header del PDF, lista de constancias, detalle, página pública de
 * verificación). Sigue el patrón "número-tipo-año" (ej. "1-CVD-2026")
 * que pidió la Secretaría para reconocer rápido el tipo al leerlo.
 *
 * NO coincide con el campo `Constancia.folio` persistido en BD, que
 * sigue formato técnico "tipo-número-año" ("CVD-1-2026") usado por
 * `folio.service.ts`, el export CSV y procesos de contabilidad.
 */
export function displayFolio(c: FolioParts): string {
  return `${c.folioNumber}-${c.type}-${c.folioYear}`;
}

const FORMATTER = new Intl.DateTimeFormat("es-HN", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Tegucigalpa",
});

export function formatDateTimeHN(d: Date): string {
  return FORMATTER.format(d);
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-HN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Tegucigalpa",
});

export function formatDateHN(d: Date): string {
  return DATE_FORMATTER.format(d);
}
