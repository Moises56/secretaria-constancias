// Funciones PURAS para fechas en español — pueden importarse desde server y
// client. NO usar `server-only` aquí: el formulario del preview las necesita.

const DAYS = [
  "",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
  "veintiuno",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
  "treinta",
  "treinta y uno",
] as const;

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export function dayToWords(day: number): string {
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new RangeError(`dayToWords: día ${day} fuera de rango (1-31)`);
  }
  return DAYS[day]!;
}

export function monthToWords(monthIndex0: number): string {
  if (!Number.isInteger(monthIndex0) || monthIndex0 < 0 || monthIndex0 > 11) {
    throw new RangeError(`monthToWords: índice ${monthIndex0} fuera de rango (0-11)`);
  }
  return MONTHS[monthIndex0]!;
}

/**
 * Convierte años entre 2000 y 2029 a palabras en español.
 * Fuera de ese rango lanza RangeError — antes de 2030 hay que ampliar
 * deliberadamente con tests para no emitir constancias con fecha mal escrita.
 */
export function yearToWords(year: number): string {
  if (!Number.isInteger(year)) {
    throw new RangeError(`yearToWords: año ${year} no es entero`);
  }
  if (year < 2000 || year > 2029) {
    throw new RangeError(
      `yearToWords: año ${year} fuera del rango soportado (2000-2029). ` +
        "Ampliar el rango deliberadamente con tests antes de 2030.",
    );
  }
  if (year === 2000) return "dos mil";
  return `dos mil ${DAYS[year - 2000]!}`;
}

export function dateInWords(d: Date): { day: string; month: string; year: string } {
  return {
    day: dayToWords(d.getDate()),
    month: monthToWords(d.getMonth()),
    year: yearToWords(d.getFullYear()),
  };
}
