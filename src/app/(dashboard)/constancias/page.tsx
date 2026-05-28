import { redirect } from "next/navigation";

import { ConstanciaListFilters } from "@/components/constancias/ConstanciaListFilters";
import { ConstanciaListPagination } from "@/components/constancias/ConstanciaListPagination";
import { ConstanciaListTable } from "@/components/constancias/ConstanciaListTable";
import { ExportCsvButton } from "@/components/constancias/ExportCsvButton";
import {
  hasActiveFilters,
  parseConstanciaListSearchParams,
} from "@/lib/validators/constancia-list";
import { requirePermission } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { listConstancias } from "@/server/services/constancia-list.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Constancias",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Reconstruye la querystring desde el shape ya validado, opcionalmente
 * sobrescribiendo o eliminando claves. Útil para construir URLs de redirect
 * preservando filtros (cambia sólo `page`, por ejemplo).
 */
function buildListSearchString(
  raw: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const merged: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    const single = Array.isArray(v) ? v[0] : v;
    if (typeof single === "string" && single !== "") merged[k] = single;
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete merged[k];
    else merged[k] = v;
  }
  const search = new URLSearchParams(merged as Record<string, string>);
  return search.toString();
}

export default async function ConstanciasPage({ searchParams }: PageProps) {
  const session = await requirePermission("CONSTANCIA_VIEW");
  const raw = await searchParams;
  const params = parseConstanciaListSearchParams(raw);
  const isAdmin = session.user.role === "ADMIN";

  const result = await listConstancias(params, session.user.role);

  // Out-of-bounds: el usuario llegó a /constancias?page=999 manualmente o
  // tras un filtro que redujo los resultados. Redirigimos a la misma URL
  // preservando filtros con page=1, en vez de mostrar una página vacía.
  if (result.total > 0 && result.page > result.totalPages) {
    const search = buildListSearchString(raw, { page: undefined });
    redirect(`/constancias${search ? `?${search}` : ""}`);
  }

  // Lista corta de usuarios para el filtro "Emitido por" (solo ADMIN).
  const users = isAdmin
    ? await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
      })
    : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header>
        <p className="text-muted-foreground mb-2 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
          Registro
        </p>
        <h1 className="font-display text-foreground text-3xl leading-tight font-semibold sm:text-4xl">
          Constancias emitidas
        </h1>
        <div className="seal-rule mt-5 max-w-md" aria-hidden>
          <span className="seal-rule__diamond" />
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <ConstanciaListFilters initial={params} users={users} isAdmin={isAdmin} />
        </div>
        <div className="lg:pt-7">
          <ExportCsvButton currentParams={params} />
        </div>
      </div>

      <ConstanciaListTable
        items={result.items}
        userRole={session.user.role}
        currentSort={params.sort}
        currentDir={params.dir}
        hasFiltersActive={hasActiveFilters(params)}
        pageSize={params.pageSize}
      />
      <ConstanciaListPagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
      />
    </div>
  );
}
