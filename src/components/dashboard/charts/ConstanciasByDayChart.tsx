"use client";

import { useEffect, useState } from "react";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useTheme } from "next-themes";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS, getChartTheme } from "@/lib/chart-tokens";

interface Props {
  data: Array<{ date: string; count: number }>;
}

export function ConstanciasByDayChart({ data }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Gate del render: recharts intenta medir el container con
  // `getBoundingClientRect()` durante el SSR/initial render y loguea
  // `width(-1) and height(-1)`. Renderizamos un placeholder de la misma
  // dimensión hasta el primer commit del cliente.
  if (!mounted) {
    return <div data-testid="chart-by-day" className="h-[260px] w-full" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";
  const theme = getChartTheme(isDark);

  return (
    <div data-testid="chart-by-day" className="h-[260px] w-full">
      {/* minHeight da una dimensión válida durante la medición inicial de
          recharts (evita el warning width(-1)/height(-1)); coincide con el
          wrapper h-[260px] para no alterar el layout. */}
      <ResponsiveContainer width="100%" minHeight={260}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -10 }}>
          <defs>
            <linearGradient id="byDayGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: theme.text, fontSize: 10 }}
            tickFormatter={(d: string) => format(parseISO(d), "dd MMM", { locale: es })}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: theme.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: theme.text,
            }}
            labelFormatter={(label) => {
              if (typeof label !== "string") return String(label ?? "");
              return format(parseISO(label), "EEEE, dd 'de' MMMM", { locale: es });
            }}
            formatter={(v) => {
              const n = typeof v === "number" ? v : 0;
              return [`${n} constancia${n === 1 ? "" : "s"}`, "Emitidas"];
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#byDayGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
