import { z } from "zod";

/**
 * Lista client-safe de acciones de auditoría. Debe reflejar las keys de
 * `AuditAction` en `src/server/lib/audit.ts` (ese archivo es `server-only` y no
 * puede importarse desde componentes cliente como los filtros). Si agregas una
 * acción en el server, espéjala aquí para que aparezca en el filtro.
 */
export const AUDIT_ACTION_VALUES = [
  "LOGIN",
  "LOGIN_FAILED",
  "LOGIN_BLOCKED",
  "LOGOUT",
  "CONSTANCIA_CREATED",
  "CONSTANCIA_ANNULLED",
  "CONSTANCIA_VERIFIED",
  "CONSTANCIA_EXPORTED",
  "SIGNER_CREATED",
  "SIGNER_UPDATED",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DEACTIVATED",
  "USER_REACTIVATED",
  "USER_PASSWORD_RESET",
  "AUDIT_EXPORTED",
] as const;

export const AUDIT_ENTITIES = ["Constancia", "User", "Signer"] as const;

export const auditListSearchParamsSchema = z.object({
  action: z.enum(AUDIT_ACTION_VALUES).optional(),
  userId: z.string().cuid().optional(),
  entity: z.enum(AUDIT_ENTITIES).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type AuditListSearchParams = z.infer<typeof auditListSearchParamsSchema>;

/**
 * Parser tolerante (mismo patrón que `parseConstanciaListSearchParams`): ignora
 * claves desconocidas y valores inválidos, cae a defaults sin lanzar.
 */
export function parseAuditListSearchParams(
  raw: Record<string, string | string[] | undefined>,
): AuditListSearchParams {
  const normalized: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    const single = Array.isArray(v) ? v[0] : v;
    if (typeof single === "string" && single !== "") {
      normalized[k] = single;
    }
  }

  const direct = auditListSearchParamsSchema.safeParse(normalized);
  if (direct.success) return direct.data;

  const fieldByField: Record<string, unknown> = {};
  const shape = auditListSearchParamsSchema.shape;
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    const fieldSchema = shape[key];
    const value = normalized[key as string];
    if (value === undefined) continue;
    const parsed = fieldSchema.safeParse(value);
    if (parsed.success) fieldByField[key as string] = parsed.data;
  }
  return auditListSearchParamsSchema.parse(fieldByField);
}

export function hasActiveAuditFilters(p: AuditListSearchParams): boolean {
  return Boolean(p.action || p.userId || p.entity || p.from || p.to);
}
