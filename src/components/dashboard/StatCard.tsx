import { type LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    /** Opcional. Texto secundario después del badge (ej. "vs periodo anterior"). */
    label?: string;
  };
  /** Acento opcional en color "seal" (uso parsimonioso). */
  accent?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  accent,
  className,
}: StatCardProps) {
  return (
    <article
      data-testid="stat-card"
      data-stat-card
      className={cn(
        "bg-card text-card-foreground border-border relative overflow-hidden rounded-lg border p-5 transition-colors",
        "before:absolute before:top-0 before:left-0 before:h-px before:w-full before:bg-gradient-to-r before:from-transparent before:via-[var(--color-border)] before:to-transparent",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-muted-foreground text-[0.7rem] font-medium tracking-[0.14em] uppercase">
          {label}
        </span>
        <span
          aria-hidden
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md",
            accent
              ? "bg-[var(--color-seal)]/12 text-[var(--color-seal)]"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-foreground text-4xl leading-none font-semibold tabular-nums">
          {value}
        </span>
        {trend && (
          <span className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium tabular-nums",
                trend.direction === "up" &&
                  "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
                trend.direction === "down" && "bg-destructive/10 text-destructive",
                trend.direction === "neutral" && "bg-muted text-muted-foreground",
              )}
            >
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-muted-foreground text-[0.65rem]">{trend.label}</span>
            )}
          </span>
        )}
      </div>

      {hint && <p className="text-muted-foreground mt-3 text-xs">{hint}</p>}
    </article>
  );
}

export function StatCardSkeleton() {
  return (
    <article
      data-testid="stat-card-skeleton"
      className="bg-card border-border rounded-lg border p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-8 rounded-md" />
      </div>
      <Skeleton className="mt-4 h-9 w-20" />
      <Skeleton className="mt-3 h-3 w-32" />
    </article>
  );
}
