import { redirect } from "next/navigation";

import { AuditExportButton } from "@/components/admin/AuditExportButton";
import { AuditFilters } from "@/components/admin/AuditFilters";
import { AuditPagination } from "@/components/admin/AuditPagination";
import { AuditTable } from "@/components/admin/AuditTable";
import { hasActiveAuditFilters, parseAuditListSearchParams } from "@/lib/validators/audit";
import { requirePermission } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { listAuditLogs } from "@/server/services/audit-list.service";

export const metadata = {
  title: "Auditoría",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function buildSearchString(
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
  return new URLSearchParams(merged as Record<string, string>).toString();
}

export default async function AuditoriaPage({ searchParams }: PageProps) {
  await requirePermission("AUDIT_VIEW");
  const raw = await searchParams;
  const params = parseAuditListSearchParams(raw);

  const result = await listAuditLogs(params);

  if (result.total > 0 && result.page > result.totalPages) {
    const search = buildSearchString(raw, { page: undefined });
    redirect(`/admin/auditoria${search ? `?${search}` : ""}`);
  }

  const users = await prisma.user.findMany({
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground mb-2 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
            Administración
          </p>
          <h1 className="font-display text-foreground text-3xl leading-tight font-semibold sm:text-4xl">
            Auditoría
          </h1>
          <div className="seal-rule mt-5 max-w-md" aria-hidden>
            <span className="seal-rule__diamond" />
          </div>
        </div>
        <AuditExportButton currentParams={params} />
      </header>

      <AuditFilters initial={params} users={users} />

      <AuditTable items={result.items} hasFiltersActive={hasActiveAuditFilters(params)} />
      <AuditPagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
      />
    </div>
  );
}
