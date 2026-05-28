interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** Wrapper consistente para charts del dashboard. */
export function ChartCard({ title, description, children, className }: ChartCardProps) {
  return (
    <section
      data-testid="chart-card"
      className={`border-border bg-card flex flex-col gap-3 rounded-lg border p-4 lg:p-6 ${className ?? ""}`}
    >
      <header className="flex flex-col gap-0.5">
        <h2 className="font-display text-foreground text-base leading-tight font-semibold">
          {title}
        </h2>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </header>
      {children}
    </section>
  );
}
