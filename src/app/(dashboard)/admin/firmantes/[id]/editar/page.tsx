import { notFound } from "next/navigation";

import { SignerForm } from "@/components/admin/SignerForm";
import { requirePermission } from "@/server/auth/require";
import { prisma } from "@/server/db";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarFirmantePage({ params }: PageProps) {
  await requirePermission("SIGNER_MANAGE");
  const { id } = await params;

  const signer = await prisma.signer.findUnique({
    where: { id },
    select: { id: true, fullName: true, titleLine: true, defaultForTypes: true, isActive: true },
  });
  if (!signer) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <p className="text-muted-foreground mb-2 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
          Administración · Firmantes
        </p>
        <h1 className="font-display text-foreground text-3xl leading-tight font-semibold">
          Editar firmante
        </h1>
        <div className="seal-rule mt-5 max-w-md" aria-hidden>
          <span className="seal-rule__diamond" />
        </div>
      </header>

      <SignerForm mode="edit" signer={signer} />
    </div>
  );
}
