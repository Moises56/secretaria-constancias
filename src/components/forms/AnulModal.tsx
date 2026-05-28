"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { annulConstanciaAction } from "@/server/actions/constancia.actions";

interface AnulModalProps {
  constanciaId: string;
  folio: string;
}

export function AnulModal({ constanciaId, folio }: AnulModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await annulConstanciaAction({ id: constanciaId, reason });
      if (result.ok) {
        toast.success(`Constancia ${folio} anulada`);
        setOpen(false);
        setReason("");
        router.refresh();
        return;
      }
      toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" data-testid="open-annul-modal">
            <ShieldAlert className="size-4" aria-hidden />
            Anular constancia
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular constancia {folio}</DialogTitle>
          <DialogDescription>
            Esta acción no se puede revertir. La verificación pública mostrará la constancia como
            ANULADA con el motivo y la fecha.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="annul-reason">Motivo (mínimo 10 caracteres)</Label>
          <Textarea
            id="annul-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Datos incorrectos del solicitante: el DNI registrado no corresponde."
            rows={4}
            disabled={isPending}
            data-testid="annul-reason"
          />
          <p className="text-muted-foreground text-xs">
            Caracteres: <span className="font-mono">{reason.trim().length}</span> / 10 mínimo
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending || reason.trim().length < 10}
            data-testid="confirm-annul"
          >
            {isPending ? "Anulando…" : "Confirmar anulación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
