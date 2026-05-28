/**
 * Sanitiza una string user-controlled para renderizado en PDF (texto plano).
 * Elimina caracteres de control (C0 + DEL) que `@react-pdf/renderer` —que usa
 * su propio renderer, no el escape de React— podría interpretar de forma
 * extraña.
 *
 * Los campos ya pasan por validación Zod (NAME_CHARS, DNI, titleLine) que NO
 * admite caracteres de control; esto es defensa en profundidad sobre el
 * snapshot inmutable del firmante/solicitante que el PDF imprime tal cual.
 */
export function sanitizeForPdf(input: string): string {
  return input.replace(/[\x00-\x1F\x7F]/g, "");
}
