import { type ReactNode } from "react";

import { requirePermission } from "@/server/auth/require";

// Refuerza el gate de proxy.ts: TODA ruta /admin/* es solo-ADMIN. Las páginas
// individuales reiteran su permiso específico (SIGNER_MANAGE, AUDIT_VIEW, …).
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePermission("USER_MANAGE");
  return <>{children}</>;
}
