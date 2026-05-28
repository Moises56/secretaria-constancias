import Link from "next/link";

import { Plus } from "lucide-react";

import { UserTable } from "@/components/admin/UserTable";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/server/auth/require";
import { prisma } from "@/server/db";

export default async function UsuariosPage() {
  const session = await requirePermission("USER_MANAGE");

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground mb-2 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
            Administración
          </p>
          <h1 className="font-display text-foreground text-3xl leading-tight font-semibold sm:text-4xl">
            Usuarios
          </h1>
          <div className="seal-rule mt-5 max-w-md" aria-hidden>
            <span className="seal-rule__diamond" />
          </div>
        </div>
        <Button
          render={<Link href="/admin/usuarios/nuevo" />}
          nativeButton={false}
          data-testid="user-new"
        >
          <Plus className="size-4" aria-hidden />
          Nuevo usuario
        </Button>
      </header>

      <UserTable users={users} currentUserId={session.user.id} />
    </div>
  );
}
