"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { type Role } from "@prisma/client";
import { ChevronUp, LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/server/actions/auth.actions";

interface UserMenuProps {
  user: {
    fullName: string;
    username: string;
    email: string;
    role: Role;
  };
  variant?: "sidebar" | "header";
}

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  SECRETARY: "Secretaría",
  VIEWER: "Consulta",
};

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function UserMenu({ user, variant = "sidebar" }: UserMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onLogout() {
    startTransition(async () => {
      await logoutAction();
      router.replace("/login");
      router.refresh();
    });
  }

  const trigger =
    variant === "sidebar" ? (
      <button
        type="button"
        className="hover:bg-sidebar-accent group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sidebar-ring)]"
        aria-label={`Menú de ${user.fullName}`}
      >
        <span className="bg-sidebar-primary text-sidebar-primary-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold tracking-wide">
          {initials(user.fullName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-sidebar-foreground block truncate text-sm font-medium">
            {user.fullName}
          </span>
          <span className="text-sidebar-foreground/60 block truncate text-xs">
            {ROLE_LABEL[user.role]}
          </span>
        </span>
        <ChevronUp
          className="text-sidebar-foreground/50 group-aria-expanded:text-sidebar-foreground size-4 transition-transform group-aria-expanded:rotate-180"
          aria-hidden
        />
      </button>
    ) : (
      <button
        type="button"
        className="ring-offset-background focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label={`Menú de ${user.fullName}`}
      >
        <span className="bg-primary text-primary-foreground inline-flex size-9 items-center justify-center rounded-full text-xs font-semibold">
          {initials(user.fullName)}
        </span>
      </button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent
        align={variant === "sidebar" ? "start" : "end"}
        side={variant === "sidebar" ? "top" : "bottom"}
        className="w-60"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">{user.fullName}</span>
            <span className="text-muted-foreground truncate text-xs font-normal">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          disabled={isPending}
          data-testid="logout-menu-item"
          className="cursor-pointer"
        >
          <LogOut className="size-4" aria-hidden />
          {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
