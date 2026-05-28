import { type ConstanciaType } from "@prisma/client";

import { TipoCard } from "@/components/admin/TipoCard";
import { TYPE_CONFIG, TYPE_DESCRIPTION, TYPE_LABEL } from "@/lib/constancia-template";
import { CONSTANCIA_TYPES } from "@/lib/validators/constancia";
import { requirePermission } from "@/server/auth/require";
import { prisma } from "@/server/db";

export default async function TiposPage() {
  await requirePermission("TYPE_MANAGE");

  // Una sola consulta: firmantes activos con su cobertura por tipo.
  const activeSigners = await prisma.signer.findMany({
    where: { isActive: true },
    select: { fullName: true, titleLine: true, defaultForTypes: true },
    orderBy: { fullName: "asc" },
  });

  const defaultSignerFor = (type: ConstanciaType) =>
    activeSigners.find((s) => s.defaultForTypes.includes(type)) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <p className="text-muted-foreground mb-2 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
          Configuración
        </p>
        <h1 className="font-display text-foreground text-3xl leading-tight font-semibold sm:text-4xl">
          Tipos de constancia
        </h1>
        <div className="seal-rule mt-5 max-w-md" aria-hidden>
          <span className="seal-rule__diamond" />
        </div>
      </header>

      <p className="text-muted-foreground text-sm">
        El sistema soporta tres tipos de constancia parametrizados. Los tipos y su configuración son
        inmutables en esta versión.
      </p>

      <div className="flex flex-col gap-3">
        {CONSTANCIA_TYPES.map((t) => (
          <TipoCard
            key={t}
            type={t}
            label={TYPE_LABEL[t]}
            description={TYPE_DESCRIPTION[t]}
            verbForm={TYPE_CONFIG[t].verbForm}
            includeInternationalClause={TYPE_CONFIG[t].includeInternationalClause}
            signer={defaultSignerFor(t)}
          />
        ))}
      </div>

      <div className="border-border rounded-md border border-dashed p-4">
        <p className="text-sm font-medium">¿Agregar un nuevo tipo?</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Requiere migración de base de datos y actualización de la plantilla. Contacte al equipo
          técnico del sistema.
        </p>
      </div>
    </div>
  );
}
