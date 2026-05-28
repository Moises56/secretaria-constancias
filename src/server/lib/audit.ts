import "server-only";

import { type ConstanciaType, type Prisma, type Role } from "@prisma/client";

import { prisma } from "@/server/db";

export const AuditAction = {
  LOGIN: "LOGIN",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGIN_BLOCKED: "LOGIN_BLOCKED",
  LOGOUT: "LOGOUT",
  CONSTANCIA_CREATED: "CONSTANCIA_CREATED",
  CONSTANCIA_ANNULLED: "CONSTANCIA_ANNULLED",
  CONSTANCIA_VERIFIED: "CONSTANCIA_VERIFIED",
  CONSTANCIA_EXPORTED: "CONSTANCIA_EXPORTED",
  // FASE 9 — administración. Si agregas una key, espéjala en
  // src/lib/validators/audit.ts (AUDIT_ACTION_VALUES) para el filtro.
  SIGNER_CREATED: "SIGNER_CREATED",
  SIGNER_UPDATED: "SIGNER_UPDATED",
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DEACTIVATED: "USER_DEACTIVATED",
  USER_REACTIVATED: "USER_REACTIVATED",
  USER_PASSWORD_RESET: "USER_PASSWORD_RESET",
  AUDIT_EXPORTED: "AUDIT_EXPORTED",
} as const;

export type VerifyResult = "FOUND_ACTIVE" | "FOUND_ANNULLED" | "NOT_FOUND" | "RATE_LIMITED";

/** Cliente que cubre tanto el PrismaClient global como una transacción. */
type PrismaLike = typeof prisma | Prisma.TransactionClient;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordLogin(args: { userId: string } & AuditContext) {
  await prisma.auditLog.create({
    data: {
      userId: args.userId,
      action: AuditAction.LOGIN,
      ipAddress: args.ipAddress ?? null,
      userAgent: args.userAgent ?? null,
    },
  });
}

export async function recordLoginFailed(
  args: { identifier: string; reason: "no_user" | "inactive" | "bad_password" } & AuditContext,
) {
  await prisma.auditLog.create({
    data: {
      action: AuditAction.LOGIN_FAILED,
      ipAddress: args.ipAddress ?? null,
      userAgent: args.userAgent ?? null,
      metadata: { identifier: args.identifier, reason: args.reason },
    },
  });
}

export async function recordLoginBlocked(args: { identifier: string } & AuditContext) {
  await prisma.auditLog.create({
    data: {
      action: AuditAction.LOGIN_BLOCKED,
      ipAddress: args.ipAddress ?? null,
      userAgent: args.userAgent ?? null,
      metadata: { identifier: args.identifier },
    },
  });
}

export async function recordLogout(args: { userId: string } & AuditContext) {
  await prisma.auditLog.create({
    data: {
      userId: args.userId,
      action: AuditAction.LOGOUT,
      ipAddress: args.ipAddress ?? null,
      userAgent: args.userAgent ?? null,
    },
  });
}

interface ConstanciaCreatedArgs {
  /** Cliente o transacción — se usa la misma tx que crea la constancia. */
  tx: PrismaLike;
  userId: string;
  constanciaId: string;
  folio: string;
  type: ConstanciaType;
  signerId: string;
  paperSerial?: string | null | undefined;
}

export async function recordConstanciaCreated(args: ConstanciaCreatedArgs) {
  await args.tx.auditLog.create({
    data: {
      userId: args.userId,
      action: AuditAction.CONSTANCIA_CREATED,
      entity: "Constancia",
      entityId: args.constanciaId,
      metadata: {
        folio: args.folio,
        type: args.type,
        signerId: args.signerId,
        paperSerial: args.paperSerial ?? null,
      },
    },
  });
}

interface ConstanciaAnnulledArgs {
  tx: PrismaLike;
  userId: string;
  constanciaId: string;
  folio: string;
  reason: string;
}

interface ConstanciaVerifiedArgs {
  ipAddress: string | null;
  userAgent: string | null;
  /** Primeros 8 chars del token — suficiente para correlación, no expone el token completo. */
  tokenPrefix: string;
  result: VerifyResult;
  /** Sólo presente cuando result es FOUND_*. */
  constanciaId?: string;
}

/**
 * Auditoría de cada acceso a la página pública /v/{token}. Registra tanto
 * hits exitosos como NOT_FOUND y RATE_LIMITED para detectar enumeration.
 *
 * NUNCA guarda el token completo — sólo `tokenPrefix` de 8 chars.
 */
export async function recordConstanciaVerified(args: ConstanciaVerifiedArgs) {
  await prisma.auditLog.create({
    data: {
      action: AuditAction.CONSTANCIA_VERIFIED,
      entity: args.constanciaId ? "Constancia" : null,
      entityId: args.constanciaId ?? null,
      ipAddress: args.ipAddress ?? null,
      userAgent: args.userAgent ?? null,
      metadata: {
        tokenPrefix: args.tokenPrefix,
        result: args.result,
      },
    },
  });
}

export async function recordConstanciaAnnulled(args: ConstanciaAnnulledArgs) {
  await args.tx.auditLog.create({
    data: {
      userId: args.userId,
      action: AuditAction.CONSTANCIA_ANNULLED,
      entity: "Constancia",
      entityId: args.constanciaId,
      metadata: {
        folio: args.folio,
        reason: args.reason,
      },
    },
  });
}

/** Snapshot serializable de los filtros aplicados al export. */
export type ExportFiltersSnapshot = Record<string, string | number | boolean | null>;

interface ConstanciaExportedArgs {
  userId: string;
  filters: ExportFiltersSnapshot;
  /** Cantidad de filas que efectivamente se exportaron. */
  rowCount: number;
}

/**
 * Auditoría de export CSV. Registramos el snapshot de filtros y el conteo
 * real de filas — útil para investigar quién bajó masivamente la base.
 */
export async function recordConstanciaExported(args: ConstanciaExportedArgs) {
  await prisma.auditLog.create({
    data: {
      userId: args.userId,
      action: AuditAction.CONSTANCIA_EXPORTED,
      entity: "Constancia",
      metadata: {
        filters: args.filters as Prisma.InputJsonValue,
        rowCount: args.rowCount,
      },
    },
  });
}

// ── FASE 9 — Administración ──────────────────────────────────────────────────
// Convención: `userId` es SIEMPRE el actor (admin que ejecuta); `entityId` es
// el registro afectado. NUNCA se guarda password, hash ni token en metadata.

interface SignerCreatedArgs {
  tx: PrismaLike;
  userId: string;
  signerId: string;
  fullName: string;
  defaultForTypes: ConstanciaType[];
  isActive: boolean;
}

export async function recordSignerCreated(args: SignerCreatedArgs) {
  await args.tx.auditLog.create({
    data: {
      userId: args.userId,
      action: AuditAction.SIGNER_CREATED,
      entity: "Signer",
      entityId: args.signerId,
      metadata: {
        fullName: args.fullName,
        defaultForTypes: args.defaultForTypes,
        isActive: args.isActive,
      } as Prisma.InputJsonValue,
    },
  });
}

interface SignerUpdatedArgs {
  tx: PrismaLike;
  userId: string;
  signerId: string;
  changedFields: string[];
  before: { isActive: boolean; defaultForTypes: ConstanciaType[] };
  after: { isActive: boolean; defaultForTypes: ConstanciaType[] };
}

export async function recordSignerUpdated(args: SignerUpdatedArgs) {
  await args.tx.auditLog.create({
    data: {
      userId: args.userId,
      action: AuditAction.SIGNER_UPDATED,
      entity: "Signer",
      entityId: args.signerId,
      metadata: {
        changedFields: args.changedFields,
        before: args.before,
        after: args.after,
      } as Prisma.InputJsonValue,
    },
  });
}

interface UserCreatedArgs {
  tx: PrismaLike;
  /** Admin que crea la cuenta. */
  actorId: string;
  targetUserId: string;
  username: string;
  role: Role;
}

export async function recordUserCreated(args: UserCreatedArgs) {
  await args.tx.auditLog.create({
    data: {
      userId: args.actorId,
      action: AuditAction.USER_CREATED,
      entity: "User",
      entityId: args.targetUserId,
      metadata: { username: args.username, role: args.role },
    },
  });
}

interface UserUpdatedArgs {
  tx: PrismaLike;
  actorId: string;
  targetUserId: string;
  changedFields: string[];
  /** Solo el rol se guarda before/after — audita escalada de privilegios. */
  roleChange?: { before: Role; after: Role };
}

export async function recordUserUpdated(args: UserUpdatedArgs) {
  await args.tx.auditLog.create({
    data: {
      userId: args.actorId,
      action: AuditAction.USER_UPDATED,
      entity: "User",
      entityId: args.targetUserId,
      metadata: {
        changedFields: args.changedFields,
        ...(args.roleChange ? { roleChange: args.roleChange } : {}),
      } as Prisma.InputJsonValue,
    },
  });
}

interface UserStatusArgs {
  tx: PrismaLike;
  actorId: string;
  targetUserId: string;
  username: string;
}

export async function recordUserDeactivated(args: UserStatusArgs) {
  await args.tx.auditLog.create({
    data: {
      userId: args.actorId,
      action: AuditAction.USER_DEACTIVATED,
      entity: "User",
      entityId: args.targetUserId,
      metadata: { username: args.username },
    },
  });
}

export async function recordUserReactivated(args: UserStatusArgs) {
  await args.tx.auditLog.create({
    data: {
      userId: args.actorId,
      action: AuditAction.USER_REACTIVATED,
      entity: "User",
      entityId: args.targetUserId,
      metadata: { username: args.username },
    },
  });
}

export async function recordUserPasswordReset(args: UserStatusArgs) {
  await args.tx.auditLog.create({
    data: {
      userId: args.actorId,
      action: AuditAction.USER_PASSWORD_RESET,
      entity: "User",
      entityId: args.targetUserId,
      metadata: { username: args.username },
    },
  });
}

interface AuditExportedArgs {
  userId: string;
  filters: ExportFiltersSnapshot;
  rowCount: number;
}

export async function recordAuditExported(args: AuditExportedArgs) {
  await prisma.auditLog.create({
    data: {
      userId: args.userId,
      action: AuditAction.AUDIT_EXPORTED,
      entity: "AuditLog",
      metadata: {
        filters: args.filters as Prisma.InputJsonValue,
        rowCount: args.rowCount,
      },
    },
  });
}
