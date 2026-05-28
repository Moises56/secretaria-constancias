import { z } from "zod";

const HONDURAS_DNI = /^\d{4}-\d{4}-\d{5}$/;
const PAPER_SERIAL = /^[A-Za-z0-9-]+$/;
const NAME_CHARS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]+$/;

export const CONSTANCIA_TYPES = ["CVD", "CVP", "CVE"] as const;
export type ConstanciaTypeLiteral = (typeof CONSTANCIA_TYPES)[number];

export const constanciaCreateSchema = z.object({
  type: z.enum(CONSTANCIA_TYPES),

  applicantFullName: z
    .string()
    .trim()
    .min(5, "Mínimo 5 caracteres")
    .max(150, "Máximo 150 caracteres")
    .regex(NAME_CHARS, "Solo letras, espacios, puntos, apóstrofes y guiones")
    .transform((v) => v.replace(/\s+/g, " ")),

  applicantIdNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(z.string().regex(HONDURAS_DNI, "Formato esperado: 0801-1990-12345")),

  paperSerial: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
      z
        .string()
        .max(30, "Máximo 30 caracteres")
        .regex(PAPER_SERIAL, "Solo letras, números y guiones")
        .or(z.literal("")),
    )
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type ConstanciaCreateInput = z.input<typeof constanciaCreateSchema>;
export type ConstanciaCreateData = z.output<typeof constanciaCreateSchema>;

export const annulConstanciaSchema = z.object({
  id: z.string().cuid("ID inválido"),
  reason: z
    .string()
    .trim()
    .min(10, "El motivo debe tener al menos 10 caracteres")
    .max(500, "Máximo 500 caracteres"),
});

export type AnnulConstanciaInput = z.infer<typeof annulConstanciaSchema>;
