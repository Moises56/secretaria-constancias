import { notFound } from "next/navigation";

import { UserForm } from "@/components/admin/UserForm";
import { requirePermission } from "@/server/auth/require";
import { prisma } from "@/server/db";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarUsuarioPage({ params }: PageProps) {
  await requirePermission("USER_MANAGE");
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, email: true, fullName: true, role: true },
  });
  if (!user) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <p className="text-muted-foreground mb-2 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
          Administración · Usuarios
        </p>
        <h1 className="font-display text-foreground text-3xl leading-tight font-semibold">
          Editar usuario
        </h1>
        <div className="seal-rule mt-5 max-w-md" aria-hidden>
          <span className="seal-rule__diamond" />
        </div>
      </header>

      <UserForm mode="edit" user={user} />
    </div>
  );
}
