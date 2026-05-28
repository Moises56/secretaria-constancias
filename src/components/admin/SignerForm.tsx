"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ConstanciaType } from "@prisma/client";
import { Loader2, PenLine } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TYPE_DESCRIPTION, TYPE_LABEL } from "@/lib/constancia-template";
import { cn } from "@/lib/utils";
import { CONSTANCIA_TYPES } from "@/lib/validators/constancia";
import { type SignerCreateInput, signerCreateSchema } from "@/lib/validators/signer";
import { createSignerAction, updateSignerAction } from "@/server/actions/signer.actions";

export interface SignerInitial {
  id: string;
  fullName: string;
  titleLine: string;
  defaultForTypes: ConstanciaType[];
  isActive: boolean;
}

interface SignerFormProps {
  mode: "create" | "edit";
  signer?: SignerInitial;
}

export function SignerForm({ mode, signer }: SignerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignerCreateInput>({
    resolver: zodResolver(signerCreateSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: signer?.fullName ?? "",
      titleLine: signer?.titleLine ?? "",
      defaultForTypes: signer?.defaultForTypes ?? [],
      isActive: signer?.isActive ?? true,
    },
  });

  // React Compiler salta este componente (react-hook-form retorna funciones no
  // memoizables). Mismo patrón documentado en NuevaConstanciaForm.
  // eslint-disable-next-line react-hooks/incompatible-library
  const watched = form.watch();
  const selectedTypes = (watched.defaultForTypes ?? []) as ConstanciaType[];
  const isActiveValue = watched.isActive ?? true;
  const errors = form.formState.errors;

  function toggleType(type: ConstanciaType, checked: boolean) {
    const next = checked
      ? [...new Set([...selectedTypes, type])]
      : selectedTypes.filter((t) => t !== type);
    form.setValue("defaultForTypes", next, { shouldValidate: true, shouldTouch: true });
  }

  function onSubmit(values: SignerCreateInput) {
    startTransition(async () => {
      const result =
        mode === "edit" && signer
          ? await updateSignerAction({ ...values, id: signer.id })
          : await createSignerAction(values);

      if (result.ok) {
        toast.success(mode === "edit" ? "Firmante actualizado" : "Firmante creado");
        router.push("/admin/firmantes");
        router.refresh();
        return;
      }
      toast.error(result.error);
    });
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex max-w-2xl flex-col gap-6"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Nombre completo</Label>
        <Input
          id="fullName"
          autoComplete="off"
          spellCheck={false}
          placeholder="Ej. Diana Alejandra Cruz Rivera"
          disabled={isPending}
          data-testid="signer-fullName"
          {...form.register("fullName")}
        />
        {errors.fullName?.message ? (
          <p className="text-destructive text-xs">{String(errors.fullName.message)}</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Se imprime LITERAL en el PDF. Respete tildes y mayúsculas.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="titleLine">Cargo / línea de título</Label>
        <Input
          id="titleLine"
          autoComplete="off"
          placeholder="Ej. Secretario Municipal del Distrito Central"
          disabled={isPending}
          data-testid="signer-titleLine"
          {...form.register("titleLine")}
        />
        {errors.titleLine?.message && (
          <p className="text-destructive text-xs">{String(errors.titleLine.message)}</p>
        )}
      </div>

      <fieldset className="flex flex-col gap-3" disabled={isPending}>
        <legend className="text-sm font-medium">Tipos asignados por defecto</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CONSTANCIA_TYPES.map((t) => {
            const active = selectedTypes.includes(t);
            return (
              <label
                key={t}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <Checkbox
                  checked={active}
                  onCheckedChange={(checked) => toggleType(t, checked === true)}
                  data-testid={`signer-type-${t}`}
                  className="mt-0.5"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="font-display text-sm leading-tight font-semibold">
                    {t} — {TYPE_LABEL[t]}
                  </span>
                  <span className="text-muted-foreground text-xs">{TYPE_DESCRIPTION[t]}</span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.defaultForTypes?.message && (
          <p className="text-destructive text-xs">{String(errors.defaultForTypes.message)}</p>
        )}
      </fieldset>

      {mode === "edit" && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={isActiveValue}
            onCheckedChange={(checked) =>
              form.setValue("isActive", checked === true, { shouldTouch: true })
            }
            disabled={isPending}
            data-testid="signer-isActive"
          />
          Firmante activo
        </label>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.push("/admin/firmantes")}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} data-testid="signer-submit">
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <PenLine className="size-4" aria-hidden />
          )}
          {mode === "edit" ? "Guardar cambios" : "Crear firmante"}
        </Button>
      </div>
    </form>
  );
}
