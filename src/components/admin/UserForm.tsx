"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  USER_ROLES,
  type UserRoleLiteral,
  userCreateSchema,
  userEditFormSchema,
} from "@/lib/validators/user";
import { createUserAction, updateUserAction } from "@/server/actions/user.actions";

export interface UserInitial {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRoleLiteral;
}

interface UserFormProps {
  mode: "create" | "edit";
  user?: UserInitial;
}

interface FormValues {
  username?: string;
  email: string;
  fullName: string;
  role: UserRoleLiteral;
  password?: string;
}

const ROLE_LABEL: Record<UserRoleLiteral, string> = {
  ADMIN: "Administrador",
  SECRETARY: "Secretaría",
  VIEWER: "Consulta",
};

export function UserForm({ mode, user }: UserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = mode === "edit";

  const form = useForm<FormValues>({
    resolver: (isEdit
      ? zodResolver(userEditFormSchema)
      : zodResolver(userCreateSchema)) as Resolver<FormValues>,
    mode: "onTouched",
    defaultValues: {
      username: user?.username ?? "",
      email: user?.email ?? "",
      fullName: user?.fullName ?? "",
      role: user?.role ?? "SECRETARY",
      password: "",
    },
  });

  const errors = form.formState.errors;

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result =
        isEdit && user
          ? await updateUserAction({
              id: user.id,
              email: values.email,
              fullName: values.fullName,
              role: values.role,
            })
          : await createUserAction(values);

      if (result.ok) {
        toast.success(isEdit ? "Usuario actualizado" : "Usuario creado");
        router.push("/admin/usuarios");
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
        <Label htmlFor="username">Nombre de usuario</Label>
        <Input
          id="username"
          autoComplete="off"
          spellCheck={false}
          placeholder="ej. jlopez"
          disabled={isPending || isEdit}
          data-testid="user-username"
          {...form.register("username")}
        />
        {isEdit ? (
          <p className="text-muted-foreground text-xs">
            El nombre de usuario es el identificador de acceso y no se puede modificar.
          </p>
        ) : (
          errors.username?.message && (
            <p className="text-destructive text-xs">{String(errors.username.message)}</p>
          )
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Nombre completo</Label>
        <Input
          id="fullName"
          autoComplete="off"
          placeholder="ej. José Luis López"
          disabled={isPending}
          data-testid="user-fullName"
          {...form.register("fullName")}
        />
        {errors.fullName?.message && (
          <p className="text-destructive text-xs">{String(errors.fullName.message)}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Correo institucional</Label>
        <Input
          id="email"
          type="email"
          autoComplete="off"
          placeholder="ej. jlopez@amdc.gob.hn"
          disabled={isPending}
          data-testid="user-email"
          {...form.register("email")}
        />
        {errors.email?.message && (
          <p className="text-destructive text-xs">{String(errors.email.message)}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="role">Rol</Label>
        <select
          id="role"
          disabled={isPending}
          data-testid="user-role"
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3 disabled:opacity-50"
          {...form.register("role")}
        >
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          {isEdit
            ? "Cambiar el rol cierra la sesión activa del usuario en su próxima navegación."
            : "Administrador: acceso completo. Secretaría: emite. Consulta: solo lectura."}
        </p>
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña inicial</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 12 caracteres"
            disabled={isPending}
            data-testid="user-password"
            {...form.register("password")}
          />
          {errors.password?.message ? (
            <p className="text-destructive text-xs">{String(errors.password.message)}</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              12+ caracteres con mayúscula, minúscula, número y símbolo.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.push("/admin/usuarios")}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} data-testid="user-submit">
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="size-4" aria-hidden />
          )}
          {isEdit ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
