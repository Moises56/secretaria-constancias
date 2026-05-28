import { UserForm } from "@/components/admin/UserForm";
import { requirePermission } from "@/server/auth/require";

export default async function NuevoUsuarioPage() {
  await requirePermission("USER_MANAGE");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <p className="text-muted-foreground mb-2 text-[0.7rem] font-medium tracking-[0.18em] uppercase">
          Administración · Usuarios
        </p>
        <h1 className="font-display text-foreground text-3xl leading-tight font-semibold">
          Nuevo usuario
        </h1>
        <div className="seal-rule mt-5 max-w-md" aria-hidden>
          <span className="seal-rule__diamond" />
        </div>
      </header>

      <UserForm mode="create" />
    </div>
  );
}
