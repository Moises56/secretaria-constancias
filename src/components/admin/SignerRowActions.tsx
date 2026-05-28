"use client";

import { useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { PenLine, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleSignerActiveAction } from "@/server/actions/signer.actions";

interface SignerRowActionsProps {
  id: string;
  fullName: string;
  isActive: boolean;
}

export function SignerRowActions({ id, fullName, isActive }: SignerRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      const result = await toggleSignerActiveAction({ id });
      if (result.ok) {
        toast.success(isActive ? "Firmante desactivado" : "Firmante activado");
        router.refresh();
        return;
      }
      toast.error(result.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            data-testid={`signer-actions-${id}`}
            disabled={isPending}
            className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-50"
            aria-label={`Acciones para ${fullName}`}
          >
            ⋯
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          render={<Link href={`/admin/firmantes/${id}/editar`} />}
          className="cursor-pointer"
        >
          <PenLine className="size-3.5" aria-hidden />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onToggle}
          variant={isActive ? "destructive" : "default"}
          data-testid={`signer-toggle-${id}`}
          className="cursor-pointer"
        >
          {isActive ? (
            <PowerOff className="size-3.5" aria-hidden />
          ) : (
            <Power className="size-3.5" aria-hidden />
          )}
          {isActive ? "Desactivar" : "Activar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
