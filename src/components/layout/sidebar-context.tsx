"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface SidebarContextValue {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const value = useMemo<SidebarContextValue>(
    () => ({
      mobileOpen,
      setMobileOpen,
      toggleMobile: () => setMobileOpen((v) => !v),
    }),
    [mobileOpen],
  );
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar debe usarse dentro de <SidebarProvider>");
  return ctx;
}
