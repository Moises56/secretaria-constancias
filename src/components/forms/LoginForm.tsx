"use client";

import { useState, useTransition } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { loginAction } from "@/server/actions/auth.actions";

interface LoginFormProps {
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    startTransition(async () => {
      const result = await loginAction(values);
      if (result.ok) {
        toast.success("Sesión iniciada");
        router.replace(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/");
        router.refresh();
        return;
      }
      toast.error(result.error);
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-3 text-center">
        <div className="bg-primary/5 ring-primary/10 mx-auto grid size-20 place-items-center rounded-full p-2 ring-1">
          <Image
            src="/amdc_original.png"
            alt="Escudo de la Alcaldía Municipal del Distrito Central"
            width={64}
            height={64}
            priority
            className="object-contain"
          />
        </div>
        <div className="space-y-1">
          <CardTitle className="font-display text-xl">Constancias AMDC</CardTitle>
          <CardDescription>Secretaría Municipal del Distrito Central</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario o correo institucional</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="username"
                      autoFocus
                      placeholder="ej. mcastro o m.castro@amdc.gob.hn"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupInput
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        disabled={isPending}
                        {...field}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          disabled={isPending}
                          aria-label={
                            showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                          }
                          aria-pressed={showPassword}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" aria-hidden />
                          ) : (
                            <Eye className="size-4" aria-hidden />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending} className="mt-2 w-full">
              <LogIn className="size-4" aria-hidden />
              {isPending ? "Verificando…" : "Iniciar sesión"}
            </Button>

            <p className="text-muted-foreground text-center text-xs">
              ¿Olvidaste tu contraseña? Contacta al administrador del sistema.
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
