"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

// Diccionario de etiquetas legibles para segmentos conocidos. Lo que no esté
// aquí cae a `capitalize(segment)`. Mantener corto y centralizado.
const SEGMENT_LABELS: Record<string, string> = {
  constancias: "Constancias",
  nueva: "Nueva",
  admin: "Administración",
  usuarios: "Usuarios",
  firmantes: "Firmantes",
  tipos: "Tipos de constancia",
  auditoria: "Auditoría",
};

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function labelFor(segment: string): string {
  return SEGMENT_LABELS[segment] ?? capitalize(decodeURIComponent(segment));
}

export interface Crumb {
  href: string;
  label: string;
  current: boolean;
}

export function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ href: "/", label: "Inicio", current: true }];

  const crumbs: Crumb[] = [{ href: "/", label: "Inicio", current: false }];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    crumbs.push({
      href: acc,
      label: labelFor(seg),
      current: i === segments.length - 1,
    });
  });
  return crumbs;
}

export function Breadcrumb() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <nav aria-label="Migas de pan" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <ChevronRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
            )}
            {c.current ? (
              <span aria-current="page" className="text-foreground truncate font-medium">
                {c.label}
              </span>
            ) : (
              <Link
                href={c.href}
                className="text-muted-foreground hover:text-foreground truncate transition-colors"
              >
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
