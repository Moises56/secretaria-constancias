import Link from "next/link";

import { Info, Plus } from "lucide-react";

import { SignerTable } from "@/components/admin/SignerTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/server/auth/require";
import { prisma } from "@/server/db";

export default async function FirmantesPage() {
  await requirePermission("SIGNER_MANAGE");

  const signers = await prisma.signer.findMany({
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
    select: { id: true, fullName: true, titleLine: true, defaultForTypes: true, isActive: true },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground mb-2 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
            Administración
          </p>
          <h1 className="font-display text-foreground text-3xl leading-tight font-semibold sm:text-4xl">
            Firmantes
          </h1>
          <div className="seal-rule mt-5 max-w-md" aria-hidden>
            <span className="seal-rule__diamond" />
          </div>
        </div>
        <Button
          render={<Link href="/admin/firmantes/nuevo" />}
          nativeButton={false}
          data-testid="signer-new"
        >
          <Plus className="size-4" aria-hidden />
          Nuevo firmante
        </Button>
      </header>

      <Alert data-testid="signer-immutable-banner">
        <Info aria-hidden />
        <AlertTitle>Los cambios en firmantes NO afectan constancias ya emitidas</AlertTitle>
        <AlertDescription>
          Cada constancia conserva un snapshot inmutable del firmante (nombre y cargo) al momento de
          su emisión. Editar o desactivar un firmante solo afecta documentos futuros.
        </AlertDescription>
      </Alert>

      <SignerTable signers={signers} />
    </div>
  );
}
