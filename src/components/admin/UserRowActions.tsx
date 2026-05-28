"use client";

import { useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { KeyRound, PenLine, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { PasswordResetModal } from "@/components/admin/PasswordResetModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deactivateUserAction, reactivateUserAction } from "@/server/actions/user.actions";

interface UserRowActionsProps {
  id: string;
  username: string;
  isActive: boolean;
  isSelf: boolean;
}

export function UserRowActions({ id, username, isActive, isSelf }: UserRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);

  function onToggle() {
    startTransition(async () => {
      const result = isActive
        ? await deactivateUserAction({ id })
        : await reactivateUserAction({ id });
      if (result.ok) {
        toast.success(isActive ? "Usuario desactivado" : "Usuario reactivado");
        router.refresh();
        return;
      }
      toast.error(result.error);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              data-testid={`user-actions-${id}`}
              disabled={isPending}
              className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-50"
              aria-label={`Acciones para ${username}`}
            >
              ⋯
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            render={<Link href={`/admin/usuarios/${id}/editar`} />}
            className="cursor-pointer"
          >
            <PenLine className="size-3.5" aria-hidden />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setResetOpen(true)}
            data-testid={`user-reset-${id}`}
            className="cursor-pointer"
          >
            <KeyRound className="size-3.5" aria-hidden />
            Restablecer contraseña
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onToggle}
            disabled={isSelf && isActive}
            variant={isActive ? "destructive" : "default"}
            data-testid={`user-toggle-${id}`}
            className="cursor-pointer"
          >
            {isActive ? (
              <PowerOff className="size-3.5" aria-hidden />
            ) : (
              <Power className="size-3.5" aria-hidden />
            )}
            {isActive ? "Desactivar" : "Reactivar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PasswordResetModal
        open={resetOpen}
        onOpenChange={setResetOpen}
        userId={id}
        username={username}
      />
    </>
  );
}
