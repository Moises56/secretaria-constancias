import { z } from "zod";

const USER_NAME_CHARS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]+$/;

export const USER_ROLES = ["ADMIN", "SECRETARY", "VIEWER"] as const;
export type UserRoleLiteral = (typeof USER_ROLES)[number];

// username: minúsculas/dígitos/guion bajo. La normalización a minúsculas ocurre
// ANTES del regex (vía transform + pipe) para que "Admin" sea válido y se
// almacene como "admin", coherente con la búsqueda case-insensitive del login.
const usernameSchema = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase())
  .pipe(
    z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(30, "Máximo 30 caracteres")
      .regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guion bajo"),
  );

const emailSchema = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase())
  .pipe(z.string().email("Correo inválido").max(150, "Máximo 150 caracteres"));

const fullNameSchema = z
  .string()
  .trim()
  .min(5, "Mínimo 5 caracteres")
  .max(150, "Máximo 150 caracteres")
  .regex(USER_NAME_CHARS, "Solo letras, espacios, puntos, apóstrofes y guiones")
  .transform((v) => v.replace(/\s+/g, " "));

// Política del usuario: ≥12 chars + mayúscula + minúscula + dígito + símbolo.
// Tope de 72 para evitar truncamiento silencioso de bcrypt-like backends.
export const passwordSchema = z
  .string()
  .min(12, "Mínimo 12 caracteres")
  .max(72, "Máximo 72 caracteres")
  .regex(/[A-Z]/, "Debe incluir una mayúscula")
  .regex(/[a-z]/, "Debe incluir una minúscula")
  .regex(/\d/, "Debe incluir un número")
  .regex(/[^A-Za-z0-9]/, "Debe incluir un símbolo");

export const userCreateSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  fullName: fullNameSchema,
  role: z.enum(USER_ROLES),
  password: passwordSchema,
});

// username NO editable (login key estable); password va por flujo de reset.
export const userUpdateSchema = z.object({
  id: z.string().cuid("ID inválido"),
  email: emailSchema,
  fullName: fullNameSchema,
  role: z.enum(USER_ROLES),
});

// Igual que userUpdateSchema pero sin `id` — el id se pasa aparte al action.
// Lo consume el resolver del formulario de edición (no incluye username/password).
export const userEditFormSchema = userUpdateSchema.omit({ id: true });

export const passwordResetSchema = z.object({
  id: z.string().cuid("ID inválido"),
  newPassword: passwordSchema,
});

export const userIdSchema = z.object({
  id: z.string().cuid("ID inválido"),
});

export type UserCreateInput = z.input<typeof userCreateSchema>;
export type UserCreateData = z.output<typeof userCreateSchema>;
export type UserUpdateInput = z.input<typeof userUpdateSchema>;
export type UserUpdateData = z.output<typeof userUpdateSchema>;
export type PasswordResetInput = z.input<typeof passwordResetSchema>;
