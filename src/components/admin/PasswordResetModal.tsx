"use client";

import { useState, useTransition } from "react";

import { Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/server/actions/user.actions";

interface PasswordResetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
}

function randInt(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] ?? 0) % max;
}

/** Contraseña fuerte con al menos una de cada clase (sin caracteres ambiguos). */
function genStrongPassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set.charAt(randInt(set.length));
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = chars.length; i < length; i++) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const tmp = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = tmp;
  }
  return chars.join("");
}

export function PasswordResetModal({
  open,
  onOpenChange,
  userId,
  username,
}: PasswordResetModalProps) {
  const [password, setPassword] = useState("");
  const [phase, setPhase] = useState<"form" | "done">("form");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setPassword("");
    setPhase("form");
    setCopied(false);
  }

  // Gatea el cierre: durante el envío y mientras no se confirme la copia.
  function handleOpenChange(next: boolean) {
    if (!next) {
      if (isPending) return;
      if (phase === "done" && !copied) {
        toast.error("Confirme que copió la contraseña antes de cerrar.");
        return;
      }
      reset();
      onOpenChange(false);
      return;
    }
    onOpenChange(true);
  }

  function onSubmit() {
    startTransition(async () => {
      const result = await resetPasswordAction({ id: userId, newPassword: password });
      if (result.ok) {
        setPhase("done");
        return;
      }
      toast.error(result.error);
    });
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success("Contraseña copiada");
    } catch {
      // Si el portapapeles falla, el admin aún puede seleccionarla manualmente.
      setCopied(true);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md" data-testid="reset-modal">
        <DialogHeader>
          <DialogTitle>Restablecer contraseña — {username}</DialogTitle>
          <DialogDescription>
            {phase === "form"
              ? "La sesión activa del usuario se cerrará en su próxima navegación."
              : "Esta es la única vez que verá esta contraseña. Cópiela y entréguela de forma segura."}
          </DialogDescription>
        </DialogHeader>

        {phase === "form" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-password">Nueva contraseña</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="reset-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 12 caracteres"
                  className="font-mono"
                  disabled={isPending}
                  data-testid="reset-password-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPassword(genStrongPassword())}
                  disabled={isPending}
                  data-testid="reset-generate"
                >
                  <RefreshCw className="size-3.5" aria-hidden />
                  Generar
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                12+ caracteres con mayúscula, minúscula, número y símbolo.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div
              data-testid="reset-shown"
              className="bg-muted flex items-center justify-between gap-2 rounded-md px-3 py-2 font-mono text-sm break-all"
            >
              <span>{password}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={copyToClipboard}
                data-testid="reset-copy"
                aria-label="Copiar contraseña"
              >
                <Copy className="size-4" aria-hidden />
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={copied}
                onCheckedChange={(c) => setCopied(c === true)}
                data-testid="reset-copied"
              />
              Ya copié y entregué la contraseña
            </label>
          </div>
        )}

        <DialogFooter>
          {phase === "form" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={isPending || password.length < 12}
                data-testid="reset-submit"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <KeyRound className="size-4" aria-hidden />
                )}
                Restablecer
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={!copied}
              data-testid="reset-close"
            >
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
