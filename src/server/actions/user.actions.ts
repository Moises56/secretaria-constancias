"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";

import {
  passwordResetSchema,
  userCreateSchema,
  userIdSchema,
  userUpdateSchema,
} from "@/lib/validators/user";
import { hashPassword } from "@/server/auth/password";
import { requirePermission } from "@/server/auth/require";
import { invalidateSecurityStampCache } from "@/server/auth/security-stamp";
import { prisma } from "@/server/db";
import {
  recordUserCreated,
  recordUserDeactivated,
  recordUserPasswordReset,
  recordUserReactivated,
  recordUserUpdated,
} from "@/server/lib/audit";
import { DomainError } from "@/server/lib/domain-error";
import { wouldRemoveLastAdmin } from "@/server/lib/invariants";
import { logger } from "@/server/lib/logger";
import { withRetries } from "@/server/lib/with-retries";

export type UserActionResult = { ok: true; id: string } | { ok: false; error: string };

/** Mapea la violación de unicidad de Prisma a un mensaje específico por campo. */
function uniqueFieldError(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = (err.meta?.target as string[] | undefined)?.join(",") ?? "";
    if (target.includes("username")) return "El nombre de usuario ya existe";
    if (target.includes("email")) return "El correo ya está registrado";
    return "Valor duplicado";
  }
  return null;
}

export async function createUserAction(input: unknown): Promise<UserActionResult> {
  let session;
  try {
    session = await requirePermission("USER_MANAGE");
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = userCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  try {
    // Hash fuera de la transacción (CPU-bound; no debe alargar la tx).
    const passwordHash = await hashPassword(data.password);

    const created = await withRetries(() =>
      prisma.$transaction(
        async (tx) => {
          const user = await tx.user.create({
            data: {
              username: data.username,
              email: data.email,
              fullName: data.fullName,
              role: data.role,
              passwordHash,
            },
            select: { id: true },
          });
          await recordUserCreated({
            tx,
            actorId: session.user.id,
            targetUserId: user.id,
            username: data.username,
            role: data.role,
          });
          return user;
        },
        { isolationLevel: "Serializable" },
      ),
    );

    revalidatePath("/admin/usuarios");
    return { ok: true, id: created.id };
  } catch (err) {
    const dup = uniqueFieldError(err);
    if (dup) return { ok: false, error: dup };
    logger.error({ err, userId: session.user.id }, "createUserAction failed");
    return { ok: false, error: "No se pudo crear el usuario. Intenta de nuevo." };
  }
}

export async function updateUserAction(input: unknown): Promise<UserActionResult> {
  let session;
  try {
    session = await requirePermission("USER_MANAGE");
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = userUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  try {
    const result = await withRetries(() =>
      prisma.$transaction(
        async (tx) => {
          const current = await tx.user.findUnique({
            where: { id: data.id },
            select: { id: true, role: true, isActive: true, email: true, fullName: true },
          });
          if (!current) throw new DomainError("Usuario no encontrado");

          const roleChanged = current.role !== data.role;

          // Degradar al último ADMIN activo deja al sistema sin administradores.
          if (roleChanged && current.role === "ADMIN") {
            const otherActiveAdmins = await tx.user.count({
              where: { id: { not: current.id }, role: "ADMIN", isActive: true },
            });
            if (
              wouldRemoveLastAdmin({
                beforeRole: current.role,
                beforeActive: current.isActive,
                afterRole: data.role,
                afterActive: current.isActive,
                otherActiveAdmins,
              })
            ) {
              throw new DomainError("No se puede degradar el rol del último administrador activo.");
            }
          }

          const changedFields: string[] = [];
          if (current.email !== data.email) changedFields.push("email");
          if (current.fullName !== data.fullName) changedFields.push("fullName");
          if (roleChanged) changedFields.push("role");

          await tx.user.update({
            where: { id: data.id },
            data: {
              email: data.email,
              fullName: data.fullName,
              role: data.role,
              // Cambiar el rol invalida la sesión activa del usuario.
              ...(roleChanged ? { securityStamp: new Date() } : {}),
            },
          });
          await recordUserUpdated({
            tx,
            actorId: session.user.id,
            targetUserId: current.id,
            changedFields,
            ...(roleChanged ? { roleChange: { before: current.role, after: data.role } } : {}),
          });
          return { id: current.id, roleChanged };
        },
        { isolationLevel: "Serializable" },
      ),
    );

    if (result.roleChanged) invalidateSecurityStampCache(result.id);
    revalidatePath("/admin/usuarios");
    return { ok: true, id: result.id };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, error: err.message };
    const dup = uniqueFieldError(err);
    if (dup) return { ok: false, error: dup };
    logger.error({ err, userId: session.user.id }, "updateUserAction failed");
    return { ok: false, error: "No se pudo actualizar el usuario. Intenta de nuevo." };
  }
}

export async function deactivateUserAction(input: unknown): Promise<UserActionResult> {
  let session;
  try {
    session = await requirePermission("USER_MANAGE");
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const { id } = parsed.data;

  // Antes de tocar la BD: nadie puede cerrarse a sí mismo.
  if (id === session.user.id) {
    return { ok: false, error: "No puede desactivar su propia cuenta." };
  }

  try {
    const result = await withRetries(() =>
      prisma.$transaction(
        async (tx) => {
          const current = await tx.user.findUnique({
            where: { id },
            select: { id: true, role: true, isActive: true, username: true },
          });
          if (!current) throw new DomainError("Usuario no encontrado");
          if (!current.isActive) throw new DomainError("El usuario ya está inactivo");

          if (current.role === "ADMIN") {
            const otherActiveAdmins = await tx.user.count({
              where: { id: { not: current.id }, role: "ADMIN", isActive: true },
            });
            if (otherActiveAdmins === 0) {
              throw new DomainError("No se puede desactivar al último administrador activo.");
            }
          }

          await tx.user.update({
            where: { id },
            data: { isActive: false, securityStamp: new Date() },
          });
          await recordUserDeactivated({
            tx,
            actorId: session.user.id,
            targetUserId: current.id,
            username: current.username,
          });
          return { id: current.id };
        },
        { isolationLevel: "Serializable" },
      ),
    );

    invalidateSecurityStampCache(result.id);
    revalidatePath("/admin/usuarios");
    return { ok: true, id: result.id };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, error: err.message };
    logger.error({ err, userId: session.user.id }, "deactivateUserAction failed");
    return { ok: false, error: "No se pudo desactivar el usuario." };
  }
}

export async function reactivateUserAction(input: unknown): Promise<UserActionResult> {
  let session;
  try {
    session = await requirePermission("USER_MANAGE");
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const { id } = parsed.data;

  try {
    const result = await withRetries(() =>
      prisma.$transaction(
        async (tx) => {
          const current = await tx.user.findUnique({
            where: { id },
            select: { id: true, isActive: true, username: true },
          });
          if (!current) throw new DomainError("Usuario no encontrado");
          if (current.isActive) throw new DomainError("El usuario ya está activo");

          await tx.user.update({
            where: { id },
            data: { isActive: true, securityStamp: new Date() },
          });
          await recordUserReactivated({
            tx,
            actorId: session.user.id,
            targetUserId: current.id,
            username: current.username,
          });
          return { id: current.id };
        },
        { isolationLevel: "Serializable" },
      ),
    );

    invalidateSecurityStampCache(result.id);
    revalidatePath("/admin/usuarios");
    return { ok: true, id: result.id };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, error: err.message };
    logger.error({ err, userId: session.user.id }, "reactivateUserAction failed");
    return { ok: false, error: "No se pudo reactivar el usuario." };
  }
}

export async function resetPasswordAction(input: unknown): Promise<UserActionResult> {
  let session;
  try {
    session = await requirePermission("USER_MANAGE");
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  try {
    const passwordHash = await hashPassword(data.newPassword);

    const result = await withRetries(() =>
      prisma.$transaction(
        async (tx) => {
          const current = await tx.user.findUnique({
            where: { id: data.id },
            select: { id: true, username: true },
          });
          if (!current) throw new DomainError("Usuario no encontrado");

          await tx.user.update({
            where: { id: data.id },
            data: { passwordHash, securityStamp: new Date() },
          });
          await recordUserPasswordReset({
            tx,
            actorId: session.user.id,
            targetUserId: current.id,
            username: current.username,
          });
          return { id: current.id };
        },
        { isolationLevel: "Serializable" },
      ),
    );

    invalidateSecurityStampCache(result.id);
    revalidatePath("/admin/usuarios");
    return { ok: true, id: result.id };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, error: err.message };
    logger.error({ err, userId: session.user.id }, "resetPasswordAction failed");
    return { ok: false, error: "No se pudo restablecer la contraseña." };
  }
}
