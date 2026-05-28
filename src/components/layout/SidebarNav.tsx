"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { type Role } from "@prisma/client";
import { ExternalLink } from "lucide-react";

import { NAV_GROUPS } from "@/components/layout/nav-items";
import { useSidebar } from "@/components/layout/sidebar-context";
import { can } from "@/server/auth/permissions";

interface SidebarNavProps {
  role: Role;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname();
  const { setMobileOpen } = useSidebar();

  return (
    <nav
      aria-label="Navegación principal"
      className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4"
    >
      {NAV_GROUPS.map((group, gi) => {
        if (group.requiresPermission && !can(role, group.requiresPermission)) return null;
        const visible = group.items.filter((it) => !it.permission || can(role, it.permission));
        if (visible.length === 0) return null;

        return (
          <div key={group.label ?? `g-${gi}`} className="flex flex-col gap-1.5">
            {group.label && (
              <div className="text-sidebar-foreground/45 mb-1 flex items-center gap-2 px-3 text-[0.65rem] font-medium tracking-[0.18em] uppercase">
                <span
                  className="inline-block size-1 rotate-45 bg-[var(--color-seal)]"
                  aria-hidden
                />
                {group.label}
              </div>
            )}
            {visible.map((item) => {
              const active = !item.external && isActive(pathname, item.href);
              const Icon = item.icon;
              const linkClass = [
                "group/nav relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-[var(--color-sidebar-ring)]",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              ].join(" ");

              if (item.external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                    <ExternalLink className="text-sidebar-foreground/40 size-3.5" aria-hidden />
                  </a>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClass}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="bg-sidebar-primary absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r"
                    />
                  )}
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
