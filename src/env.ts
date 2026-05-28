import { z } from "zod";

const numericInchesSchema = z.coerce
  .number()
  .positive("Debe ser un número positivo")
  .max(8, "Margen irrealmente grande (>8 in)");

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  APP_URL: z.string().url("APP_URL debe ser una URL válida"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL es requerido"),

  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET debe tener al menos 32 caracteres (usa openssl rand -base64 32)"),
  AUTH_URL: z.string().url("AUTH_URL debe ser una URL válida"),

  VERIFICATION_HMAC_SECRET: z
    .string()
    .min(32, "VERIFICATION_HMAC_SECRET debe tener al menos 32 caracteres"),

  PDF_TOP_MARGIN_INCHES: numericInchesSchema.default(2.6),
  PDF_BOTTOM_MARGIN_INCHES: numericInchesSchema.default(1.4),
  PDF_LEFT_MARGIN_INCHES: numericInchesSchema.default(1.1),
  PDF_RIGHT_MARGIN_INCHES: numericInchesSchema.default(0.9),

  SEED_ADMIN_USERNAME: z.string().min(3).default("admin"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@amdc.gob.hn"),
  SEED_ADMIN_PASSWORD: z
    .string()
    .min(12, "SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres")
    .default("ChangeMe!Once12345"),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `\n❌ Variables de entorno inválidas:\n${issues}\n` +
      `\n→ Revisa tu archivo .env (ver .env.example).\n`,
  );
}

export const env = parsed.data;
export type Env = typeof env;
