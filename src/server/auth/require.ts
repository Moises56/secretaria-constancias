import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { can, type Permission } from "@/server/auth/permissions";

export class ForbiddenError extends Error {
  constructor(message = "No autorizado") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function requirePermission(perm: Permission) {
  const session = await requireAuth();
  if (!can(session.user.role, perm)) {
    throw new ForbiddenError(`Falta permiso: ${perm}`);
  }
  return session;
}
