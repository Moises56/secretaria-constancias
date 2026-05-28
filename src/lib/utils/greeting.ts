const TZ = "America/Tegucigalpa";

/**
 * Saludo de cortesía según la hora local de Honduras.
 *  - 05:00–11:59 → "Buenos días"
 *  - 12:00–17:59 → "Buenas tardes"
 *  - 18:00–04:59 → "Buenas noches"
 *
 * SSR-safe: usa `Intl.DateTimeFormat` con timezone fijo `America/Tegucigalpa`.
 * El resultado NO depende del locale del server ni del cliente — no hay
 * hydration mismatch.
 */
export function greetingForHour(date: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 18) return "Buenas tardes";
  return "Buenas noches";
}
