"use client";

import { Drawer } from "@base-ui/react/drawer";
import { type Role } from "@prisma/client";
import { X } from "lucide-react";

import { useSidebar } from "@/components/layout/sidebar-context";
import { SidebarBrand } from "@/components/layout/SidebarBrand";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { UserMenu } from "@/components/layout/UserMenu";

interface AppSidebarUser {
  fullName: string;
  username: string;
  email: string;
  role: Role;
}

interface AppSidebarProps {
  user: AppSidebarUser;
}

function SidebarBody({ user }: AppSidebarProps) {
  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full w-[260px] flex-col">
      <SidebarBrand />
      <SidebarNav role={user.role} />
      <div className="border-sidebar-border border-t p-3">
        <UserMenu user={user} variant="sidebar" />
      </div>
    </div>
  );
}

export function AppSidebar({ user }: AppSidebarProps) {
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Desktop: sidebar fija ≥lg */}
      <aside
        aria-label="Navegación lateral"
        className="hidden lg:block lg:shrink-0"
        data-testid="app-sidebar-desktop"
      >
        <SidebarBody user={user} />
      </aside>

      {/* Mobile: drawer */}
      <Drawer.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 lg:hidden" />
          <Drawer.Viewport className="fixed inset-0 z-50 lg:hidden">
            <Drawer.Popup
              className="bg-sidebar text-sidebar-foreground absolute inset-y-0 left-0 flex w-[260px] flex-col transition-transform duration-200 ease-out data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full"
              data-testid="app-sidebar-drawer"
            >
              <Drawer.Title className="sr-only">Navegación principal</Drawer.Title>
              <Drawer.Description className="sr-only">
                Enlaces a las secciones del sistema, filtrados por tu rol.
              </Drawer.Description>
              <Drawer.Close
                className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sidebar-ring)]"
                aria-label="Cerrar navegación"
              >
                <X className="size-4" aria-hidden />
              </Drawer.Close>
              <SidebarBody user={user} />
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
