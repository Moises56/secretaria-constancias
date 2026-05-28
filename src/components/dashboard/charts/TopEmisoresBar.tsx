"use client";

import { useEffect, useState } from "react";

import { useTheme } from "next-themes";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { CHART_COLORS, getChartTheme } from "@/lib/chart-tokens";

interface Props {
  data: Array<{ userId: string; fullName: string; count: number }>;
}

export function TopEmisoresBar({ data }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Acortar nombres muy largos en el axis (>22 chars)
  const display = data.map((d) => ({
    ...d,
    short: d.fullName.length > 22 ? `${d.fullName.slice(0, 20)}…` : d.fullName,
  }));

  const height = Math.max(180, display.length * 48 + 40);

  // Gate del render — ver `ConstanciasByDayChart.tsx` para el racional.
  if (!mounted) {
    return (
      <div data-testid="chart-top-emisores" style={{ height }} className="w-full" aria-hidden />
    );
  }

  const isDark = resolvedTheme === "dark";
  const theme = getChartTheme(isDark);

  return (
    <div data-testid="chart-top-emisores" style={{ height }} className="w-full">
      {/* minHeight = altura computada del wrapper: dimensión válida en la
          medición inicial (evita warning width(-1)/height(-1)). */}
      <ResponsiveContainer width="100%" minHeight={height}>
        <BarChart
          data={display}
          layout="vertical"
          margin={{ top: 6, right: 16, bottom: 6, left: 0 }}
        >
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: theme.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="short"
            type="category"
            tick={{ fill: theme.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={150}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: theme.text,
            }}
            formatter={(v) => {
              const n = typeof v === "number" ? v : 0;
              return [`${n} constancia${n === 1 ? "" : "s"}`, "Emitidas"];
            }}
            // Volver al fullName real en el tooltip (no el truncado).
            labelFormatter={(_short, payload) => {
              const row = payload?.[0]?.payload as { fullName?: string } | undefined;
              return row?.fullName ?? _short;
            }}
          />
          <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
