import "server-only";

import { headers } from "next/headers";

/**
 * Extrae la IP real del cliente desde un objeto `Headers`.
 *
 * Detrás del reverse proxy de AMDC (nginx) recibimos `X-Forwarded-For`
 * con la lista completa de saltos y `X-Real-IP` con la IP del último
 * cliente. Preferimos `X-Forwarded-For[0]` (la IP del cliente original
 * según la convención del proxy) y caemos a `X-Real-IP` si XFF está
 * ausente.
 *
 * Es seguro confiar en estos headers porque el proxy AMDC es la única
 * ruta de ingreso a la app y siempre los reescribe (cualquier valor que
 * un cliente intente spoofear queda sobrescrito por el proxy antes de
 * llegar acá). En un despliegue sin proxy de confianza, esto permitiría
 * suplantación.
 *
 * Devuelve `"unknown"` si ningún header está presente — string sentinel,
 * nunca null, para que el AuditLog tenga un valor consistente.
 */
export function getClientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = h.get("x-real-ip");
  if (xri) {
    const trimmed = xri.trim();
    if (trimmed) return trimmed;
  }
  return "unknown";
}

/**
 * Variante async para usar en Server Components / Server Actions / Route
 * Handlers — donde no tenemos un objeto Request a mano y leemos los
 * headers del request actual via `next/headers`.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return getClientIpFromHeaders(h);
}
