import { type Role } from "@prisma/client";

// NO existe SIGNER_OVERRIDE en v1. El firmante se resuelve siempre por
// Signer.isActive && defaultForTypes has type.
export const PERMISSIONS = {
  CONSTANCIA_CREATE: ["ADMIN", "SECRETARY"],
  CONSTANCIA_VIEW: ["ADMIN", "SECRETARY", "VIEWER"],
  CONSTANCIA_ANNUL: ["ADMIN"],
  SIGNER_MANAGE: ["ADMIN"],
  USER_MANAGE: ["ADMIN"],
  TYPE_MANAGE: ["ADMIN"],
  AUDIT_VIEW: ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, perm: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[perm] as readonly Role[]).includes(role);
}
