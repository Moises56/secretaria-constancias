import {
  FilePlus,
  FileText,
  Home,
  type LucideIcon,
  PenLine,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";

import { type Permission } from "@/server/auth/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Permiso requerido; si ausente, accesible para todo rol autenticado. */
  permission?: Permission;
  /** Abre en nueva pestaña con rel noopener (para destinos externos). */
  external?: boolean;
}

export interface NavGroup {
  /** Si ausente, el grupo no muestra encabezado. */
  label?: string;
  /** Si está presente y el usuario no lo tiene, oculta el grupo entero. */
  requiresPermission?: Permission;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Inicio", icon: Home },
      {
        href: "/constancias/nueva",
        label: "Nueva constancia",
        icon: FilePlus,
        permission: "CONSTANCIA_CREATE",
      },
      {
        href: "/constancias",
        label: "Constancias",
        icon: FileText,
        permission: "CONSTANCIA_VIEW",
      },
    ],
  },
  {
    label: "Administración",
    requiresPermission: "USER_MANAGE",
    items: [
      { href: "/admin/firmantes", label: "Firmantes", icon: PenLine, permission: "SIGNER_MANAGE" },
      { href: "/admin/tipos", label: "Tipos de constancia", icon: Tags, permission: "TYPE_MANAGE" },
      { href: "/admin/usuarios", label: "Usuarios", icon: Users, permission: "USER_MANAGE" },
      { href: "/admin/auditoria", label: "Auditoría", icon: ShieldCheck, permission: "AUDIT_VIEW" },
    ],
  },
];
