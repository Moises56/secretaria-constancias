"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { signerCreateSchema, signerUpdateSchema } from "@/lib/validators/signer";
import { requirePermission } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { recordSignerCreated, recordSignerUpdated } from "@/server/lib/audit";
import { DomainError } from "@/server/lib/domain-error";
import { typesLosingActiveSigner } from "@/server/lib/invariants";
import { logger } from "@/server/lib/logger";
import { withRetries } from "@/server/lib/with-retries";

export type SignerActionResult = { ok: true; id: string } | { ok: false; error: string };

const signerIdSchema = z.object({ id: z.string().cuid("ID inválido") });

/** Refresca las vistas que dependen de los firmantes activos por tipo. */
function revalidateSignerViews(signerId?: string) {
  revalidatePath("/admin/firmantes");
  revalidatePath("/admin/tipos");
  // El formulario de nueva constancia resuelve el firmante por tipo en runtime.
  revalidatePath("/constancias/nueva");
  if (signerId) revalidatePath(`/admin/firmantes/${signerId}/editar`);
}

export async function createSignerAction(input: unknown): Promise<SignerActionResult> {
  let session;
  try {
    session = await requirePermission("SIGNER_MANAGE");
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = signerCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  try {
    // Crear nunca viola la invariante (solo agrega cobertura).
    const created = await withRetries(() =>
      prisma.$transaction(
        async (tx) => {
          const signer = await tx.signer.create({
            data: {
              fullName: data.fullName,
              titleLine: data.titleLine,
              defaultForTypes: data.defaultForTypes,
              isActive: data.isActive,
            },
            select: { id: true, defaultForTypes: true },
          });
          await recordSignerCreated({
            tx,
            userId: session.user.id,
            signerId: signer.id,
            fullName: data.fullName,
            defaultForTypes: signer.defaultForTypes,
            isActive: data.isActive,
          });
          return signer;
        },
        { isolationLevel: "Serializable" },
      ),
    );

    revalidateSignerViews(created.id);
    return { ok: true, id: created.id };
  } catch (err) {
    logger.error({ err, userId: session.user.id }, "createSignerAction failed");
    return { ok: false, error: "No se pudo crear el firmante. Intenta de nuevo." };
  }
}

export async function updateSignerAction(input: unknown): Promise<SignerActionResult> {
  let session;
  try {
    session = await requirePermission("SIGNER_MANAGE");
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = signerUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  try {
    const updated = await withRetries(() =>
      prisma.$transaction(
        async (tx) => {
          const current = await tx.signer.findUnique({
            where: { id: data.id },
            select: {
              id: true,
              isActive: true,
              defaultForTypes: true,
              fullName: true,
              titleLine: true,
            },
          });
          if (!current) throw new DomainError("Firmante no encontrado");

          // Solo los tipos que el firmante DEJA de cubrir activamente requieren
          // verificar que exista otro firmante activo asignado.
          const atRisk = typesLosingActiveSigner({
            wasActive: current.isActive,
            currentTypes: current.defaultForTypes,
            willBeActive: data.isActive,
            nextTypes: data.defaultForTypes,
          });
          for (const type of atRisk) {
            const others = await tx.signer.count({
              where: { id: { not: current.id }, isActive: true, defaultForTypes: { has: type } },
            });
            if (others === 0) {
              throw new DomainError(
                `No se puede: el tipo ${type} quedaría sin firmante activo asignado. ` +
                  `Asigne otro firmante a ${type} antes de continuar.`,
              );
            }
          }

          const after = await tx.signer.update({
            where: { id: data.id },
            data: {
              fullName: data.fullName,
              titleLine: data.titleLine,
              defaultForTypes: data.defaultForTypes,
              isActive: data.isActive,
            },
            select: { id: true, isActive: true, defaultForTypes: true },
          });

          const changedFields: string[] = [];
          if (current.fullName !== data.fullName) changedFields.push("fullName");
          if (current.titleLine !== data.titleLine) changedFields.push("titleLine");
          if (current.isActive !== after.isActive) changedFields.push("isActive");
          if (
            [...current.defaultForTypes].sort().join(",") !==
            [...after.defaultForTypes].sort().join(",")
          ) {
            changedFields.push("defaultForTypes");
          }

          await recordSignerUpdated({
            tx,
            userId: session.user.id,
            signerId: after.id,
            changedFields,
            before: { isActive: current.isActive, defaultForTypes: current.defaultForTypes },
            after: { isActive: after.isActive, defaultForTypes: after.defaultForTypes },
          });
          return after;
        },
        { isolationLevel: "Serializable" },
      ),
    );

    revalidateSignerViews(updated.id);
    return { ok: true, id: updated.id };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, error: err.message };
    logger.error({ err, userId: session.user.id }, "updateSignerAction failed");
    return { ok: false, error: "No se pudo actualizar el firmante. Intenta de nuevo." };
  }
}

/** Activar/desactivar desde el menú de fila. Reusa la invariante al desactivar. */
export async function toggleSignerActiveAction(input: unknown): Promise<SignerActionResult> {
  let session;
  try {
    session = await requirePermission("SIGNER_MANAGE");
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = signerIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }
  const { id } = parsed.data;

  try {
    const updated = await withRetries(() =>
      prisma.$transaction(
        async (tx) => {
          const current = await tx.signer.findUnique({
            where: { id },
            select: { id: true, isActive: true, defaultForTypes: true },
          });
          if (!current) throw new DomainError("Firmante no encontrado");

          const nextActive = !current.isActive;
          if (!nextActive) {
            for (const type of current.defaultForTypes) {
              const others = await tx.signer.count({
                where: { id: { not: current.id }, isActive: true, defaultForTypes: { has: type } },
              });
              if (others === 0) {
                throw new DomainError(
                  `No se puede desactivar: el tipo ${type} quedaría sin firmante activo asignado.`,
                );
              }
            }
          }

          const after = await tx.signer.update({
            where: { id },
            data: { isActive: nextActive },
            select: { id: true, isActive: true, defaultForTypes: true },
          });
          await recordSignerUpdated({
            tx,
            userId: session.user.id,
            signerId: after.id,
            changedFields: ["isActive"],
            before: { isActive: current.isActive, defaultForTypes: current.defaultForTypes },
            after: { isActive: after.isActive, defaultForTypes: after.defaultForTypes },
          });
          return after;
        },
        { isolationLevel: "Serializable" },
      ),
    );

    revalidateSignerViews(updated.id);
    return { ok: true, id: updated.id };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, error: err.message };
    logger.error({ err, userId: session.user.id }, "toggleSignerActiveAction failed");
    return { ok: false, error: "No se pudo cambiar el estado del firmante." };
  }
}
