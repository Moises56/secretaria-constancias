"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { useGSAP } from "@gsap/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ConstanciaType } from "@prisma/client";
import gsap from "gsap";
import { FileSignature, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TYPE_CONFIG,
  TYPE_DESCRIPTION,
  TYPE_LABEL,
  renderConstanciaText,
} from "@/lib/constancia-template";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/utils/use-reduced-motion";
import {
  CONSTANCIA_TYPES,
  type ConstanciaCreateInput,
  constanciaCreateSchema,
} from "@/lib/validators/constancia";
import { createConstanciaAction } from "@/server/actions/constancia.actions";

export interface SignerOption {
  id: string;
  fullName: string;
  titleLine: string;
  defaultForTypes: ConstanciaType[];
}

interface NuevaConstanciaFormProps {
  signers: SignerOption[];
}

/** Formatea progresivamente "0801199012345" → "0801-1990-12345". */
function maskDni(raw: string): string {
  const digits = raw.replace(/\D+/g, "").slice(0, 13);
  const a = digits.slice(0, 4);
  const b = digits.slice(4, 8);
  const c = digits.slice(8, 13);
  if (digits.length <= 4) return a;
  if (digits.length <= 8) return `${a}-${b}`;
  return `${a}-${b}-${c}`;
}

/** Resuelve el firmante por defecto para un tipo dado. */
function resolveSigner(signers: SignerOption[], type: ConstanciaType): SignerOption | undefined {
  return signers.find((s) => s.defaultForTypes.includes(type));
}

export function NuevaConstanciaForm({ signers }: NuevaConstanciaFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const reduce = usePrefersReducedMotion();
  const typeGridRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLPreElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<ConstanciaCreateInput>({
    resolver: zodResolver(constanciaCreateSchema),
    mode: "onTouched",
    defaultValues: {
      type: "CVP",
      applicantFullName: "",
      applicantIdNumber: "",
      paperSerial: "",
    },
  });

  // React Compiler salta este componente — `react-hook-form` retorna funciones
  // que no son memoizables. Es esperado y documentado por la regla.
  // eslint-disable-next-line react-hooks/incompatible-library
  const watched = form.watch();
  const selectedType = (watched.type ?? "CVP") as ConstanciaType;
  const resolvedSigner = useMemo(
    () => resolveSigner(signers, selectedType),
    [signers, selectedType],
  );

  // Preview en vivo — folio 0 indica "se asignará al guardar".
  const previewText = useMemo(() => {
    if (!resolvedSigner) return "";
    const issuedAt = new Date();
    const safeName = watched.applicantFullName?.trim() || "[Nombre del solicitante]";
    const safeDni = watched.applicantIdNumber?.trim() || "[####-####-#####]";
    try {
      return renderConstanciaText({
        folioNumber: 0,
        folioYear: issuedAt.getFullYear(),
        fullName: safeName,
        idNumber: safeDni,
        type: selectedType,
        issuedAt,
        signerName: resolvedSigner.fullName,
        signerTitleLine: resolvedSigner.titleLine,
      });
    } catch {
      return "";
    }
  }, [selectedType, resolvedSigner, watched.applicantFullName, watched.applicantIdNumber]);

  function onSubmit(values: ConstanciaCreateInput) {
    startTransition(async () => {
      const result = await createConstanciaAction(values);
      if (result.ok) {
        toast.success(`Constancia ${result.folio} emitida`);
        // `?new=1` activa el highlight de folio en la página de detalle.
        router.push(`/constancias/${result.id}?new=1`);
        router.refresh();
        return;
      }
      toast.error(result.error);
    });
  }

  // Hover lift sutil sobre cada type card.
  useGSAP(
    () => {
      if (reduce || !typeGridRef.current) return;
      const cards = typeGridRef.current.querySelectorAll<HTMLElement>("[data-type-card]");
      const cleanups: (() => void)[] = [];
      cards.forEach((card) => {
        const onEnter = () => {
          gsap.to(card, { y: -2, duration: 0.2, ease: "power2.out" });
        };
        const onLeave = () => {
          gsap.to(card, { y: 0, duration: 0.2, ease: "power2.out" });
        };
        card.addEventListener("mouseenter", onEnter);
        card.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          card.removeEventListener("mouseenter", onEnter);
          card.removeEventListener("mouseleave", onLeave);
        });
      });
      return () => cleanups.forEach((fn) => fn());
    },
    { scope: typeGridRef, dependencies: [reduce] },
  );

  // Fade rápido del preview cuando cambia el tipo. El `mounted` guard
  // evita aplicar `opacity: 0.5` durante la hidratación (server renderiza
  // con opacity: 1 default → mismatch).
  useGSAP(
    () => {
      if (reduce || !mounted || !previewRef.current) return;
      gsap.fromTo(
        previewRef.current,
        { opacity: 0.5 },
        { opacity: 1, duration: 0.25, ease: "power1.out" },
      );
    },
    { dependencies: [selectedType, reduce, mounted] },
  );

  // Cmd/Ctrl+Enter dispara submit
  function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void form.handleSubmit(onSubmit)();
    }
  }

  const errors = form.formState.errors;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header>
        <p className="text-muted-foreground mb-2 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
          Emitir documento
        </p>
        <h1 className="font-display text-foreground text-3xl leading-tight font-semibold sm:text-4xl">
          Nueva constancia de vecindad
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Tres campos. Folio automático. La constancia se emite al confirmar.
        </p>
        <div className="seal-rule mt-5 max-w-md" aria-hidden>
          <span className="seal-rule__diamond" />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1fr_1fr]">
        {/* ─────────────────────────────  FORMULARIO  ───────────────────────────── */}
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          onKeyDown={onKeyDown}
          className="flex flex-col gap-6"
        >
          {/* Tipo */}
          <fieldset className="flex flex-col gap-3" disabled={isPending}>
            <legend className="text-sm font-medium">Tipo de constancia</legend>
            <div
              ref={typeGridRef}
              role="radiogroup"
              aria-label="Tipo de constancia"
              className="grid gap-2 sm:grid-cols-3"
            >
              {CONSTANCIA_TYPES.map((t) => {
                const active = selectedType === t;
                return (
                  <label
                    key={t}
                    data-type-card
                    className={cn(
                      "group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 transition-colors outline-none",
                      "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2",
                      active
                        ? "border-primary bg-primary/5 ring-primary/40 ring-2"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <input type="radio" value={t} {...form.register("type")} className="sr-only" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm leading-tight font-semibold">
                        {TYPE_LABEL[t]}
                      </span>
                      <Badge variant={active ? "default" : "secondary"} className="shrink-0">
                        {TYPE_CONFIG[t].verbForm}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">{TYPE_DESCRIPTION[t]}</p>
                  </label>
                );
              })}
            </div>
            {errors.type?.message && (
              <p className="text-destructive text-xs">{String(errors.type.message)}</p>
            )}
          </fieldset>

          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="applicantFullName">Nombre completo del solicitante</Label>
            <Input
              id="applicantFullName"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="Ejemplo: María Fernanda López Rodríguez"
              disabled={isPending}
              className="uppercase placeholder:normal-case"
              {...form.register("applicantFullName")}
            />
            {errors.applicantFullName?.message ? (
              <p className="text-destructive text-xs">{String(errors.applicantFullName.message)}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Se mostrará en mayúsculas en el documento (acentos preservados).
              </p>
            )}
          </div>

          {/* DNI */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="applicantIdNumber">Número de identidad</Label>
            <Input
              id="applicantIdNumber"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0801-1990-12345"
              disabled={isPending}
              className="font-mono tracking-wide"
              {...form.register("applicantIdNumber", {
                onChange: (e) => {
                  e.target.value = maskDni(e.target.value);
                },
              })}
            />
            {errors.applicantIdNumber?.message && (
              <p className="text-destructive text-xs">{String(errors.applicantIdNumber.message)}</p>
            )}
          </div>

          {/* paperSerial opcional */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paperSerial">
              Serial del papel <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="paperSerial"
              autoComplete="off"
              placeholder="SM-2348"
              disabled={isPending}
              className="font-mono tracking-wide uppercase placeholder:normal-case"
              {...form.register("paperSerial")}
            />
            {errors.paperSerial?.message ? (
              <p className="text-destructive text-xs">{String(errors.paperSerial.message)}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Identificador del papel membretado físico. Útil para auditoría.
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-muted-foreground text-xs">
              Atajo:{" "}
              <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-[0.7rem]">
                ⌘/Ctrl + Enter
              </kbd>
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => form.reset()}
              >
                Limpiar
              </Button>
              <Button type="submit" disabled={isPending} data-testid="submit-constancia">
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <FileSignature className="size-4" aria-hidden />
                )}
                {isPending ? "Emitiendo…" : "Emitir constancia"}
              </Button>
            </div>
          </div>
        </form>

        {/* ─────────────────────────────  PREVIEW  ───────────────────────────── */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <h2 className="text-muted-foreground mb-3 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
            Vista previa
          </h2>
          <Card>
            <CardContent className="p-6">
              <pre
                ref={previewRef}
                data-testid="constancia-preview"
                className="font-display text-foreground/95 max-h-[640px] overflow-y-auto text-[0.78rem] leading-relaxed whitespace-pre-wrap"
              >
                {previewText || "Selecciona un tipo para ver la vista previa."}
              </pre>
            </CardContent>
          </Card>
          {resolvedSigner ? (
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
              Firmará <strong className="text-foreground">{resolvedSigner.fullName}</strong> —{" "}
              {resolvedSigner.titleLine}.
            </p>
          ) : (
            <p className="text-destructive mt-3 text-xs">
              No hay firmante activo asignado al tipo seleccionado. Avise al administrador.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
