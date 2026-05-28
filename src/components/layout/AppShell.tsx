"use client";

import { type Role } from "@prisma/client";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { Toaster } from "@/components/ui/sonner";

interface AppShellProps {
  user: {
    fullName: string;
    username: string;
    email: string;
    role: Role;
  };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <SidebarProvider>
      {/* Skip link — invisible hasta foco, primer tab stop. */}
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>

      <div className="flex min-h-screen">
        <AppSidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader user={user} />
          <main
            id="main-content"
            tabIndex={-1}
            className="bg-background flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 outline-none lg:px-8 lg:py-8"
          >
            {children}
          </main>
        </div>
      </div>
      <Toaster richColors closeButton position="top-center" />
    </SidebarProvider>
  );
}
