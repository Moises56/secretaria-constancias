import { AppShell } from "@/components/layout/AppShell";
import { requireAuth } from "@/server/auth/require";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  return <AppShell user={session.user}>{children}</AppShell>;
}
