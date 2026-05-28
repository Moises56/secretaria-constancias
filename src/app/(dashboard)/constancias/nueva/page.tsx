import { NuevaConstanciaForm, type SignerOption } from "@/components/forms/NuevaConstanciaForm";
import { requirePermission } from "@/server/auth/require";
import { prisma } from "@/server/db";

export const metadata = {
  title: "Nueva constancia",
};

export default async function NuevaConstanciaPage() {
  await requirePermission("CONSTANCIA_CREATE");

  // Lista de firmantes activos para resolver el firmante por tipo en el preview.
  // En v1 NO hay selector (no se hace override) — sólo se muestra read-only.
  const signers = await prisma.signer.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, titleLine: true, defaultForTypes: true },
    orderBy: { fullName: "asc" },
  });

  return <NuevaConstanciaForm signers={signers satisfies SignerOption[]} />;
}
