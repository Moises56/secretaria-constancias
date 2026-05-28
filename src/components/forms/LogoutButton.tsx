"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/server/actions/auth.actions";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await logoutAction();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      data-testid="logout-button"
    >
      <LogOut className="size-4" aria-hidden />
      {isPending ? "Saliendo…" : "Cerrar sesión"}
    </Button>
  );
}
