// Paleta hex para charts. recharts no acepta `var(--token)` directamente,
// por eso duplicamos los colores institucionales aquí. Si la paleta de
// `globals.css` cambia, sincronizar manualmente este archivo.

export const CHART_COLORS = {
  /** Azul institucional AMDC (mismo que `--primary` light). */
  primary: "#1e40af",
  /** Slate medio — CVD (vecindad pasada). */
  cvd: "#64748b",
  /** Azul institucional — CVP (vecindad vigente). */
  cvp: "#1e40af",
  /** Emerald — CVE (uso en el extranjero). */
  cve: "#10b981",
  /** Rojo institucional — constancias anuladas. */
  annulled: "#dc2626",

  grid: "#e2e8f0",
  gridDark: "#1e293b",
  text: "#475569",
  textDark: "#94a3b8",
  surface: "#ffffff",
  surfaceDark: "#0f172a",
} as const;

export interface ChartTheme {
  text: string;
  grid: string;
  surface: string;
  border: string;
}

export function getChartTheme(isDark: boolean): ChartTheme {
  return {
    text: isDark ? CHART_COLORS.textDark : CHART_COLORS.text,
    grid: isDark ? CHART_COLORS.gridDark : CHART_COLORS.grid,
    surface: isDark ? CHART_COLORS.surfaceDark : CHART_COLORS.surface,
    border: isDark ? CHART_COLORS.gridDark : CHART_COLORS.grid,
  };
}
