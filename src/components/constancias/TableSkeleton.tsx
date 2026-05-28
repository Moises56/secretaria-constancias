import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 8 }: TableSkeletonProps) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-lg border">
      <div className="bg-muted/40 grid grid-cols-12 gap-3 px-4 py-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="col-span-1 h-3 first:col-span-2 last:col-span-1" />
        ))}
      </div>
      <div className="divide-border divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 items-center gap-3 px-4 py-3">
            <Skeleton className="col-span-2 h-4" />
            <Skeleton className="col-span-1 h-5 rounded-full" />
            <Skeleton className="col-span-3 h-4" />
            <Skeleton className="col-span-2 h-4" />
            <Skeleton className="col-span-1 h-4" />
            <Skeleton className="col-span-2 h-4" />
            <Skeleton className="col-span-1 h-5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
