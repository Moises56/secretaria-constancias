import { type Role } from "@prisma/client";

import { UserRowActions } from "@/components/admin/UserRowActions";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeHN } from "@/lib/utils/format";

export interface UserRow {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
}

interface UserTableProps {
  users: UserRow[];
  currentUserId: string;
}

const ROLE_BADGE: Record<Role, "default" | "secondary"> = {
  ADMIN: "default",
  SECRETARY: "secondary",
  VIEWER: "secondary",
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  SECRETARY: "Secretaría",
  VIEWER: "Consulta",
};

export function UserTable({ users, currentUserId }: UserTableProps) {
  return (
    <div className="border-border bg-card overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-border border-b">
          <tr className="text-muted-foreground text-left text-[0.65rem] font-medium tracking-[0.14em] uppercase">
            <th scope="col" className="px-4 py-2.5">
              Usuario
            </th>
            <th scope="col" className="px-4 py-2.5">
              Nombre
            </th>
            <th scope="col" className="px-4 py-2.5">
              Rol
            </th>
            <th scope="col" className="px-4 py-2.5">
              Estado
            </th>
            <th scope="col" className="px-4 py-2.5">
              Último ingreso
            </th>
            <th scope="col" className="sr-only px-2">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {users.map((u) => (
            <tr
              key={u.id}
              data-testid="user-row"
              data-row-id={u.id}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3">
                <span className="font-mono font-medium">{u.username}</span>
                {u.id === currentUserId && (
                  <span className="text-muted-foreground ml-1.5 text-xs">(tú)</span>
                )}
                <div className="text-muted-foreground truncate text-xs">{u.email}</div>
              </td>
              <td className="max-w-[200px] truncate px-4 py-3" title={u.fullName}>
                {u.fullName}
              </td>
              <td className="px-4 py-3">
                <Badge variant={ROLE_BADGE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
              </td>
              <td className="px-4 py-3">
                {u.isActive ? (
                  <Badge variant="default">Activo</Badge>
                ) : (
                  <Badge variant="secondary" className="opacity-70">
                    Inactivo
                  </Badge>
                )}
              </td>
              <td className="text-muted-foreground px-4 py-3 text-xs">
                {u.lastLoginAt ? formatDateTimeHN(u.lastLoginAt) : "Nunca"}
              </td>
              <td className="px-2 py-3 text-right">
                <UserRowActions
                  id={u.id}
                  username={u.username}
                  isActive={u.isActive}
                  isSelf={u.id === currentUserId}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
