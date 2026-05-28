"use server";

import { createHmac, randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { env } from "@/env";
import { annulConstanciaSchema, constanciaCreateSchema } from "@/lib/validators/constancia";
import { requirePermission } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { recordConstanciaAnnulled, recordConstanciaCreated } from "@/server/lib/audit";
import { logger } from "@/server/lib/logger";
import { withRetries } from "@/server/lib/with-retries";
import { generateFolio } from "@/server/services/folio.service";

export type CreateConstanciaResult =
  | { ok: true; id: string; folio: string }
  | { ok: false; error: string };

export async function createConstanciaAction(input: unknown): Promise<CreateConstanciaResult> {
  let session;
  try {
    session = await requirePermission("CONSTANCIA_CREATE");
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = constanciaCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const data = parsed.data;

  try {
    const result = await withRetries(() =>
      prisma.$transaction(
        async (tx) => {
          // 1. Resolver firmante por defecto (NO override en v1).
          const signer = await tx.signer.findFirstOrThrow({
            where: { isActive: true, defaultForTypes: { has: data.type } },
          });

          // 2. Folio atómico dentro de la misma tx.
          const { folio, folioNumber, folioYear } = await generateFolio(data.type, tx);

          // 3. Token de verificación opaco (HMAC). 64 hex chars.
          const payload = `${folio}|${Date.now()}|${randomBytes(8).toString("hex")}`;
          const verificationToken = createHmac("sha256", env.VERIFICATION_HMAC_SECRET)
            .update(payload)
            .digest("hex");

          // 4. Constancia con SNAPSHOT INMUTABLE del firmante.
          const constancia = await tx.constancia.create({
            data: {
              type: data.type,
              folio,
              folioNumber,
              folioYear,
              applicantFullName: data.applicantFullName,
              applicantIdNumber: data.applicantIdNumber,
              paperSerial: data.paperSerial,
              signerName: signer.fullName,
              signerTitleLine: signer.titleLine,
              signerIdAtIssue: signer.id,
              verificationToken,
              issuedById: session.user.id,
            },
            select: { id: true, folio: true },
          });

          // 5. AuditLog en la misma tx.
          await recordConstanciaCreated({
            tx,
            userId: session.user.id,
            constanciaId: constancia.id,
            folio,
            type: data.type,
            signerId: signer.id,
            paperSerial: data.paperSerial,
          });

          return constancia;
        },
        { isolationLevel: "Serializable" },
      ),
    );

    revalidatePath("/");
    revalidatePath("/constancias");
    return { ok: true, id: result.id, folio: result.folio };
  } catch (err) {
    logger.error({ err, userId: session.user.id }, "createConstanciaAction failed");
    return { ok: false, error: "No se pudo generar la constancia. Intenta de nuevo." };
  }
}

export type AnnulConstanciaResult = { ok: true } | { ok: false; error: string };

export async function annulConstanciaAction(input: unknown): Promise<AnnulConstanciaResult> {
  let session;
  try {
    session = await requirePermission("CONSTANCIA_ANNUL");
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = annulConstanciaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { id, reason } = parsed.data;

  try {
    const current = await prisma.constancia.findUnique({
      where: { id },
      select: { folio: true, status: true },
    });
    if (!current) return { ok: false, error: "Constancia no encontrada" };
    if (current.status === "ANNULLED") {
      return { ok: false, error: "La constancia ya está anulada" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.constancia.update({
        where: { id },
        data: {
          status: "ANNULLED",
          annulledAt: new Date(),
          annulledReason: reason,
          annulledById: session.user.id,
        },
      });
      await recordConstanciaAnnulled({
        tx,
        userId: session.user.id,
        constanciaId: id,
        folio: current.folio,
        reason,
      });
    });

    revalidatePath("/");
    revalidatePath("/constancias");
    revalidatePath(`/constancias/${id}`);
    return { ok: true };
  } catch (err) {
    logger.error({ err, id, userId: session.user.id }, "annulConstanciaAction failed");
    return { ok: false, error: "No se pudo anular la constancia" };
  }
}
