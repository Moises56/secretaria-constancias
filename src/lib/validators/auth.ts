import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Mínimo 3 caracteres").max(100),
  password: z.string().min(8, "Mínimo 8 caracteres").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
