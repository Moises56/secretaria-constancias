import { cn } from "@/lib/utils";

interface DataRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  small?: boolean;
}

/** Fila de datos para la página pública de verificación. */
export function DataRow({ label, value, mono = false, small = false }: DataRowProps) {
  return (
    <div className="grid grid-cols-1 gap-1 md:grid-cols-3 md:gap-4">
      <dt className="text-muted-foreground text-[0.65rem] font-medium tracking-[0.18em] uppercase">
        {label}
      </dt>
      <dd className={cn("md:col-span-2", mono && "font-mono", small && "text-sm leading-relaxed")}>
        {value}
      </dd>
    </div>
  );
}
