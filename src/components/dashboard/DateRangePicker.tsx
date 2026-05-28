"use client";

import { useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PRESET_LABEL, STATS_PRESETS, type StatsPreset } from "@/lib/validators/stats-range";

interface DateRangePickerProps {
  current: StatsPreset;
  from?: string;
  to?: string;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateRangePicker({ current, from, to }: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (current === "custom" && from && to) {
      return { from: new Date(`${from}T00:00:00`), to: new Date(`${to}T00:00:00`) };
    }
    return undefined;
  });

  function applyPreset(preset: StatsPreset) {
    const params = new URLSearchParams(searchParams.toString());
    if (preset === "30d") {
      params.delete("preset"); // default
    } else {
      params.set("preset", preset);
    }
    params.delete("from");
    params.delete("to");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function applyCustom(picked: DateRange | undefined) {
    setRange(picked);
    if (!picked?.from || !picked?.to) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", "custom");
    params.set("from", toISO(picked.from));
    params.set("to", toISO(picked.to));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  const customLabel =
    current === "custom" && from && to
      ? `${format(new Date(`${from}T00:00:00`), "dd MMM", { locale: es })} – ${format(new Date(`${to}T00:00:00`), "dd MMM", { locale: es })}`
      : "Personalizado";

  return (
    <div
      data-testid="date-range-picker"
      className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 py-1 [&>button]:flex-shrink-0 [&>div]:flex-shrink-0"
      role="group"
      aria-label="Rango de fechas"
    >
      {STATS_PRESETS.filter((p) => p !== "custom").map((preset) => (
        <Button
          key={preset}
          type="button"
          size="sm"
          variant={current === preset ? "default" : "outline"}
          onClick={() => applyPreset(preset)}
          aria-pressed={current === preset}
          data-testid={`preset-${preset}`}
        >
          {PRESET_LABEL[preset]}
        </Button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant={current === "custom" ? "default" : "outline"}
              aria-pressed={current === "custom"}
              data-testid="preset-custom"
              className={cn("gap-1.5", current === "custom" && "font-mono text-xs")}
            />
          }
        >
          <CalendarIcon className="size-3.5" aria-hidden />
          {customLabel}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            selected={range}
            onSelect={applyCustom}
            numberOfMonths={2}
            locale={es}
            captionLayout="label"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
