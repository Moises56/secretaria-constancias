"use client";

import { X } from "lucide-react";

import { useListParamsUpdater } from "@/components/constancias/use-list-params";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIT_ACTION_GROUPS, auditActionLabel } from "@/lib/audit-display";
import {
  AUDIT_ENTITIES,
  type AuditListSearchParams,
  hasActiveAuditFilters,
} from "@/lib/validators/audit";

interface UserOption {
  id: string;
  fullName: string;
}

interface AuditFiltersProps {
  initial: AuditListSearchParams;
  users: UserOption[];
}

export function AuditFilters({ initial, users }: AuditFiltersProps) {
  const { updateParam, clearAll } = useListParamsUpdater();
  const showClear = hasActiveAuditFilters(initial);

  return (
    <div
      className="border-border bg-card flex flex-wrap items-end gap-3 rounded-lg border p-4"
      data-testid="audit-filters"
    >
      <div className="w-[220px]">
        <Label className="text-muted-foreground mb-1.5 text-xs">Acción</Label>
        <Select
          value={initial.action ?? "all"}
          onValueChange={(v) => updateParam("action", v && v !== "all" ? v : undefined)}
        >
          <SelectTrigger data-testid="audit-filter-action" className="w-full">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {AUDIT_ACTION_GROUPS.map((group) => (
              <SelectGroup key={group.category}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {auditActionLabel(action)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-[150px]">
        <Label className="text-muted-foreground mb-1.5 text-xs">Entidad</Label>
        <Select
          value={initial.entity ?? "all"}
          onValueChange={(v) => updateParam("entity", v && v !== "all" ? v : undefined)}
        >
          <SelectTrigger data-testid="audit-filter-entity" className="w-full">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {AUDIT_ENTITIES.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {users.length > 0 && (
        <div className="w-[200px]">
          <Label className="text-muted-foreground mb-1.5 text-xs">Usuario</Label>
          <Select
            value={initial.userId ?? "all"}
            onValueChange={(v) => updateParam("userId", v && v !== "all" ? v : undefined)}
          >
            <SelectTrigger data-testid="audit-filter-user" className="w-full">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="w-[150px]">
        <Label htmlFor="audit-from" className="text-muted-foreground mb-1.5 text-xs">
          Desde
        </Label>
        <Input
          id="audit-from"
          data-testid="audit-filter-from"
          type="date"
          value={initial.from ?? ""}
          onChange={(e) => updateParam("from", e.target.value || undefined)}
        />
      </div>

      <div className="w-[150px]">
        <Label htmlFor="audit-to" className="text-muted-foreground mb-1.5 text-xs">
          Hasta
        </Label>
        <Input
          id="audit-to"
          data-testid="audit-filter-to"
          type="date"
          value={initial.to ?? ""}
          onChange={(e) => updateParam("to", e.target.value || undefined)}
        />
      </div>

      {showClear && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          data-testid="audit-filter-clear"
        >
          <X className="size-3.5" aria-hidden />
          Limpiar
        </Button>
      )}
    </div>
  );
}
