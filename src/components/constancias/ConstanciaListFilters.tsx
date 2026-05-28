"use client";

import { useEffect, useRef, useState } from "react";

import { Search, X } from "lucide-react";

import { useListParamsUpdater } from "@/components/constancias/use-list-params";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ConstanciaListSearchParams,
  hasActiveFilters,
} from "@/lib/validators/constancia-list";

interface UserOption {
  id: string;
  fullName: string;
}

interface ConstanciaListFiltersProps {
  initial: ConstanciaListSearchParams;
  users: UserOption[];
  isAdmin: boolean;
}

const DEBOUNCE_MS = 300;

export function ConstanciaListFilters({ initial, users, isAdmin }: ConstanciaListFiltersProps) {
  const { updateParam, clearAll } = useListParamsUpdater();
  const [qLocal, setQLocal] = useState(initial.q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronizar prop → state desde un effect es un anti-patrón en general,
  // pero acá es el contrato: el listado es URL-driven y el input es solo
  // display local con debounce. Si el padre cambia el query (clearAll o
  // deep-link), el input debe reflejarlo.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQLocal(initial.q ?? "");
  }, [initial.q]);

  function onSearchChange(value: string) {
    setQLocal(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam("q", value.trim() || undefined);
    }, DEBOUNCE_MS);
  }

  const showClear = hasActiveFilters(initial) || qLocal.length > 0;

  return (
    <div
      className="border-border bg-card flex flex-wrap items-end gap-3 rounded-lg border p-4"
      data-testid="constancia-filters"
    >
      <div className="min-w-[220px] flex-1">
        <Label htmlFor="list-q" className="text-muted-foreground mb-1.5 text-xs">
          Buscar
        </Label>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="list-q"
            data-testid="filter-q"
            value={qLocal}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Folio, nombre o DNI…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="w-[140px]">
        <Label className="text-muted-foreground mb-1.5 text-xs">Tipo</Label>
        <Select
          value={initial.type ?? "all"}
          onValueChange={(v) => updateParam("type", v && v !== "all" ? v : undefined)}
        >
          <SelectTrigger data-testid="filter-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="CVD">CVD</SelectItem>
            <SelectItem value="CVP">CVP</SelectItem>
            <SelectItem value="CVE">CVE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-[140px]">
        <Label className="text-muted-foreground mb-1.5 text-xs">Estado</Label>
        <Select
          value={initial.status ?? "all"}
          onValueChange={(v) => updateParam("status", v && v !== "all" ? v : undefined)}
        >
          <SelectTrigger data-testid="filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ACTIVE">Activas</SelectItem>
            <SelectItem value="ANNULLED">Anuladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-[150px]">
        <Label htmlFor="filter-from" className="text-muted-foreground mb-1.5 text-xs">
          Desde
        </Label>
        <Input
          id="filter-from"
          data-testid="filter-from"
          type="date"
          value={initial.from ?? ""}
          onChange={(e) => updateParam("from", e.target.value || undefined)}
        />
      </div>

      <div className="w-[150px]">
        <Label htmlFor="filter-to" className="text-muted-foreground mb-1.5 text-xs">
          Hasta
        </Label>
        <Input
          id="filter-to"
          data-testid="filter-to"
          type="date"
          value={initial.to ?? ""}
          onChange={(e) => updateParam("to", e.target.value || undefined)}
        />
      </div>

      {isAdmin && users.length > 0 && (
        <div className="w-[180px]">
          <Label className="text-muted-foreground mb-1.5 text-xs">Emitido por</Label>
          <Select
            value={initial.issuedById ?? "all"}
            onValueChange={(v) => updateParam("issuedById", v && v !== "all" ? v : undefined)}
          >
            <SelectTrigger data-testid="filter-issued-by">
              <SelectValue />
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

      {showClear && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setQLocal("");
            clearAll();
          }}
          data-testid="filter-clear"
        >
          <X className="size-3.5" aria-hidden />
          Limpiar
        </Button>
      )}
    </div>
  );
}
