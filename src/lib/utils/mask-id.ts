/**
 * Enmascara los primeros 3 dígitos del último grupo de un DNI hondureño.
 * Ejemplo: "0801-1990-12345" → "0801-1990-XXX45"
 *
 * Si el formato no es exactamente `####-####-#####` (3 grupos de 4-4-5
 * dígitos), retorna el input sin cambios — fail-open pero seguro: nunca
 * expone más información que la entrante.
 */
const DNI_PATTERN = /^(\d{4})-(\d{4})-(\d{5})$/;

export function maskDni(dni: string): string {
  if (!dni) return dni;
  const m = DNI_PATTERN.exec(dni);
  if (!m) return dni;
  const [, a, b, c] = m;
  return `${a}-${b}-XXX${c!.slice(3)}`;
}
