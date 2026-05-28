import { FileText, Layers, ShieldCheck, TrendingUp } from "lucide-react";

import { ChartCard } from "@/components/dashboard/ChartCard";
import { ConstanciasByDayChart } from "@/components/dashboard/charts/ConstanciasByDayChart";
import { DistributionDonut } from "@/components/dashboard/charts/DistributionDonut";
import { TopEmisoresBar } from "@/components/dashboard/charts/TopEmisoresBar";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { EmptyDashboardState } from "@/components/dashboard/EmptyDashboardState";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatCardsGrid } from "@/components/dashboard/StatCardsGrid";
import {
  PRESET_LABEL,
  parseStatsRangeParams,
  resolveStatsRange,
} from "@/lib/validators/stats-range";
import { can } from "@/server/auth/permissions";
import { requireAuth } from "@/server/auth/require";
import { getStats } from "@/server/services/stats.service";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const raw = await searchParams;
  const params = parseStatsRangeParams(raw);
  const range = resolveStatsRange(params);

  const stats = await getStats({
    from: range.from,
    to: range.to,
    previousFrom: range.previousFrom,
    previousTo: range.previousTo,
    role: session.user.role,
  });

  const canCreate = can(session.user.role, "CONSTANCIA_CREATE");
  const isEmpty = stats.totalCurrent === 0 && stats.annulled === 0;

  const totalTrend =
    stats.pctChange !== null
      ? {
          value: `${stats.pctChange >= 0 ? "+" : ""}${stats.pctChange.toFixed(1)}%`,
          direction:
            stats.pctChange > 0
              ? ("up" as const)
              : stats.pctChange < 0
                ? ("down" as const)
                : ("neutral" as const),
          label: "vs periodo anterior",
        }
      : undefined;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header>
        <p className="text-muted-foreground mb-2 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
          Panel principal
        </p>
        <h1 className="font-display text-foreground text-3xl leading-tight font-semibold sm:text-4xl">
          Buenas, {firstName(session.user.fullName)}.
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Resumen de actividad de la Secretaría Municipal del Distrito Central.
        </p>
        <div className="seal-rule mt-5 max-w-md" aria-hidden>
          <span className="seal-rule__diamond" />
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Periodo:{" "}
          <span className="text-foreground font-medium" data-testid="current-preset">
            {PRESET_LABEL[params.preset]}
          </span>
        </p>
        <DateRangePicker current={params.preset} from={params.from} to={params.to} />
      </div>

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Estadísticas
        </h2>
        <StatCardsGrid>
          <StatCard
            label="Total del periodo"
            value={stats.totalCurrent.toString()}
            icon={TrendingUp}
            accent
            trend={totalTrend}
          />
          <StatCard
            label="CVD"
            value={stats.byType.CVD.toString()}
            icon={FileText}
            hint="Vecindad pasada"
          />
          <StatCard
            label="CVP"
            value={stats.byType.CVP.toString()}
            icon={Layers}
            hint="Vecindad vigente"
          />
          <StatCard
            label="CVE"
            value={stats.byType.CVE.toString()}
            icon={ShieldCheck}
            hint="Uso en el extranjero"
          />
        </StatCardsGrid>
      </section>

      {isEmpty ? (
        <EmptyDashboardState canCreate={canCreate} />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Constancias por día"
              description="Emisiones activas en el rango seleccionado"
            >
              <ConstanciasByDayChart data={stats.series} />
            </ChartCard>
            <ChartCard title="Distribución por tipo">
              <DistributionDonut byType={stats.byType} />
            </ChartCard>
          </section>

          {stats.topEmisores && stats.topEmisores.length > 0 && (
            <ChartCard
              title="Top emisores del periodo"
              description="Personal con más emisiones en el rango"
            >
              <TopEmisoresBar data={stats.topEmisores} />
            </ChartCard>
          )}
        </>
      )}

      {canCreate && (
        <section aria-labelledby="actions-heading">
          <h2
            id="actions-heading"
            className="text-muted-foreground mb-3 text-[0.7rem] font-medium tracking-[0.18em] uppercase"
          >
            Acciones rápidas
          </h2>
          <QuickActions />
        </section>
      )}
    </div>
  );
}
