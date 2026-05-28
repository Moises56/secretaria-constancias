"use client";

import { useEffect, useState } from "react";

import { type ConstanciaType } from "@prisma/client";
import { useTheme } from "next-themes";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { CHART_COLORS, getChartTheme } from "@/lib/chart-tokens";
import { TYPE_LABEL } from "@/lib/constancia-template";

interface Props {
  byType: Record<ConstanciaType, number>;
}

const SLICE_COLOR: Record<ConstanciaType, string> = {
  CVD: CHART_COLORS.cvd,
  CVP: CHART_COLORS.cvp,
  CVE: CHART_COLORS.cve,
};

export function DistributionDonut({ byType }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Gate del render — ver `ConstanciasByDayChart.tsx` para el racional.
  if (!mounted) {
    return <div data-testid="chart-donut" className="h-[260px] w-full" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";
  const theme = getChartTheme(isDark);

  const entries = (Object.keys(byType) as ConstanciaType[])
    .map((t) => ({
      name: TYPE_LABEL[t],
      value: byType[t],
      color: SLICE_COLOR[t],
    }))
    .filter((d) => d.value > 0);

  const total = entries.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div
        data-testid="chart-donut-empty"
        className="text-muted-foreground flex h-[260px] items-center justify-center text-sm"
      >
        Sin datos en este periodo.
      </div>
    );
  }

  return (
    <div data-testid="chart-donut" className="h-[260px] w-full">
      {/* minHeight: dimensión válida en la medición inicial (evita warning
          width(-1)/height(-1)); coincide con el wrapper h-[260px]. */}
      <ResponsiveContainer width="100%" minHeight={260}>
        <PieChart>
          <Pie
            data={entries}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            stroke={theme.surface}
            strokeWidth={2}
          >
            {entries.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: theme.text,
            }}
            formatter={(v, name) => {
              const n = typeof v === "number" ? v : 0;
              return [`${n} (${((n / total) * 100).toFixed(0)}%)`, name as string];
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(v: string) => <span style={{ color: theme.text, fontSize: 12 }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
