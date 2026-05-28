"use server";

import { AuthError } from "next-auth";

import { loginSchema } from "@/lib/validators/auth";
import { auth, signIn, signOut } from "@/server/auth";
import { recordLogout } from "@/server/lib/audit";

export type LoginActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const GENERIC_ERROR = "Credenciales inválidas o cuenta bloqueada";

export async function loginAction(input: unknown): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      identifier: parsed.data.identifier,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    // CredentialsSignin / AuthError cubren todos los modos de falla
    // (no user, inactivo, bad password, rate-limit). Devolvemos genérico.
    if (err instanceof AuthError) {
      return { ok: false, error: GENERIC_ERROR };
    }
    // Bug del lado de Next/Auth.js: redirect() interno arroja NEXT_REDIRECT;
    // como usamos redirect:false no debería disparar, pero por las dudas
    // re-lanzamos para que Next lo procese.
    throw err;
  }
}

export async function logoutAction(): Promise<void> {
  const session = await auth();
  if (session?.user?.id) {
    await recordLogout({ userId: session.user.id });
  }
  await signOut({ redirect: false });
}
