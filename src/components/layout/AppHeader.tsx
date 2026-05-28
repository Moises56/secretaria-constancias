"use client";

import { type Role } from "@prisma/client";
import { Menu } from "lucide-react";

import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { useSidebar } from "@/components/layout/sidebar-context";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface AppHeaderProps {
  user: {
    fullName: string;
    username: string;
    email: string;
    role: Role;
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  const { toggleMobile } = useSidebar();
  return (
    <header className="bg-background/85 border-border supports-[backdrop-filter]:bg-background/65 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-md lg:px-6">
      <button
        type="button"
        onClick={toggleMobile}
        className="hover:bg-muted ring-offset-background focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-2 lg:hidden"
        aria-label="Abrir menú de navegación"
        data-testid="header-hamburger"
      >
        <Menu className="size-4" aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <span className="bg-border mx-1 hidden h-5 w-px lg:inline-block" aria-hidden />
        <div className="lg:hidden">
          <UserMenu user={user} variant="header" />
        </div>
      </div>
    </header>
  );
}
