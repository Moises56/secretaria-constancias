import { z } from "zod";

import { CONSTANCIA_TYPES } from "@/lib/validators/constancia";

// Mismo set que el nombre del solicitante (letras acentuadas + puntuación de nombre).
const SIGNER_NAME_CHARS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]+$/;
// El cargo lleva números y puntuación: "Acuerdo de Delegación N.001 AMDC-SM-2026".
const TITLE_LINE_CHARS = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s'.,°º()\-/]+$/;

export const signerCreateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(5, "Mínimo 5 caracteres")
    .max(150, "Máximo 150 caracteres")
    .regex(SIGNER_NAME_CHARS, "Solo letras, espacios, puntos, apóstrofes y guiones")
    .transform((v) => v.replace(/\s+/g, " ")),

  titleLine: z
    .string()
    .trim()
    .min(5, "Mínimo 5 caracteres")
    .max(200, "Máximo 200 caracteres")
    .regex(TITLE_LINE_CHARS, "Caracteres no permitidos en el cargo")
    .transform((v) => v.replace(/\s+/g, " ")),

  defaultForTypes: z
    .array(z.enum(CONSTANCIA_TYPES))
    .min(1, "Debe asignar al menos un tipo")
    .transform((arr) => [...new Set(arr)]),

  isActive: z.boolean().default(true),
});

export const signerUpdateSchema = signerCreateSchema.extend({
  id: z.string().cuid("ID inválido"),
});

export type SignerCreateInput = z.input<typeof signerCreateSchema>;
export type SignerCreateData = z.output<typeof signerCreateSchema>;
export type SignerUpdateInput = z.input<typeof signerUpdateSchema>;
export type SignerUpdateData = z.output<typeof signerUpdateSchema>;
