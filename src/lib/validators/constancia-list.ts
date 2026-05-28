import { z } from "zod";

import { CONSTANCIA_TYPES } from "@/lib/validators/constancia";

export const CONSTANCIA_SORT_FIELDS = ["issuedAt", "folio", "applicantFullName"] as const;
export type ConstanciaSortField = (typeof CONSTANCIA_SORT_FIELDS)[number];

export const constanciaListSearchParamsSchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(CONSTANCIA_TYPES).optional(),
  status: z.enum(["ACTIVE", "ANNULLED"]).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD")
    .optional(),
  issuedById: z.string().cuid().optional(),
  sort: z.enum(CONSTANCIA_SORT_FIELDS).default("issuedAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type ConstanciaListSearchParams = z.infer<typeof constanciaListSearchParamsSchema>;

/**
 * Parser tolerante: ignora claves desconocidas y valores inválidos,
 * cae a defaults sin lanzar. La URL del usuario puede ser cualquier cosa.
 *
 * Acepta el shape de `Next.searchParams` ya resuelto (después de `await`).
 */
export function parseConstanciaListSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ConstanciaListSearchParams {
  // 1) Aplanar arrays a single value (Next pasa arrays cuando hay duplicados).
  // 2) Castear safeParse a cada campo individualmente; valores inválidos caen
  //    a undefined antes de pasar al schema completo (que aplica defaults).
  const normalized: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    const single = Array.isArray(v) ? v[0] : v;
    if (typeof single === "string" && single !== "") {
      normalized[k] = single;
    }
  }

  // Intento parsear todo de una; si falla, hacemos un parse por campo para
  // descartar solo los inválidos y mantener los buenos.
  const direct = constanciaListSearchParamsSchema.safeParse(normalized);
  if (direct.success) return direct.data;

  const fieldByField: Record<string, unknown> = {};
  const shape = constanciaListSearchParamsSchema.shape;
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    const fieldSchema = shape[key];
    const raw = normalized[key as string];
    if (raw === undefined) continue;
    const parsed = fieldSchema.safeParse(raw);
    if (parsed.success) fieldByField[key as string] = parsed.data;
  }
  return constanciaListSearchParamsSchema.parse(fieldByField);
}

/**
 * Devuelve true si el params tiene al menos un filtro activo (algo distinto
 * de los defaults). Útil para mostrar el botón "Limpiar filtros".
 */
export function hasActiveFilters(p: ConstanciaListSearchParams): boolean {
  return Boolean(
    p.q ||
    p.type ||
    p.status ||
    p.from ||
    p.to ||
    p.issuedById ||
    p.sort !== "issuedAt" ||
    p.dir !== "desc",
  );
}
