// Presentación client-safe del log de auditoría: labels en español, grupos por
// categoría para el filtro, y colores de badge. Espeja AUDIT_ACTION_VALUES de
// src/lib/validators/audit.ts (que a su vez espeja AuditAction del server).

export type AuditCategory = "AUTH" | "CONSTANCIA" | "USER" | "SIGNER" | "AUDIT";

export interface AuditActionGroup {
  category: AuditCategory;
  label: string;
  actions: readonly string[];
}

/** Grupos visuales del Select de filtro (en el orden en que se muestran). */
export const AUDIT_ACTION_GROUPS: readonly AuditActionGroup[] = [
  {
    category: "AUTH",
    label: "Autenticación",
    actions: ["LOGIN", "LOGIN_FAILED", "LOGIN_BLOCKED", "LOGOUT"],
  },
  {
    category: "CONSTANCIA",
    label: "Constancias",
    actions: [
      "CONSTANCIA_CREATED",
      "CONSTANCIA_ANNULLED",
      "CONSTANCIA_VERIFIED",
      "CONSTANCIA_EXPORTED",
    ],
  },
  {
    category: "USER",
    label: "Usuarios",
    actions: [
      "USER_CREATED",
      "USER_UPDATED",
      "USER_DEACTIVATED",
      "USER_REACTIVATED",
      "USER_PASSWORD_RESET",
    ],
  },
  {
    category: "SIGNER",
    label: "Firmantes",
    actions: ["SIGNER_CREATED", "SIGNER_UPDATED"],
  },
  {
    category: "AUDIT",
    label: "Auditoría",
    actions: ["AUDIT_EXPORTED"],
  },
];

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  LOGIN: "Inicio de sesión",
  LOGIN_FAILED: "Login fallido",
  LOGIN_BLOCKED: "Login bloqueado",
  LOGOUT: "Cierre de sesión",
  CONSTANCIA_CREATED: "Constancia emitida",
  CONSTANCIA_ANNULLED: "Constancia anulada",
  CONSTANCIA_VERIFIED: "Constancia verificada",
  CONSTANCIA_EXPORTED: "Export de constancias",
  SIGNER_CREATED: "Firmante creado",
  SIGNER_UPDATED: "Firmante actualizado",
  USER_CREATED: "Usuario creado",
  USER_UPDATED: "Usuario actualizado",
  USER_DEACTIVATED: "Usuario desactivado",
  USER_REACTIVATED: "Usuario reactivado",
  USER_PASSWORD_RESET: "Contraseña restablecida",
  AUDIT_EXPORTED: "Export de auditoría",
};

const ACTION_TO_CATEGORY: Record<string, AuditCategory> = Object.fromEntries(
  AUDIT_ACTION_GROUPS.flatMap((g) => g.actions.map((a) => [a, g.category] as const)),
);

export function auditActionCategory(action: string): AuditCategory {
  return ACTION_TO_CATEGORY[action] ?? "AUDIT";
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

/** Clases Tailwind del badge por categoría. */
export const AUDIT_CATEGORY_BADGE: Record<AuditCategory, string> = {
  AUTH: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CONSTANCIA: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  USER: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  SIGNER: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  AUDIT: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};
