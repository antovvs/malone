"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePeriod } from "@/hooks/use-period";
import { PERIOD_PRESETS, type PeriodPreset } from "@/lib/period";

/** Sélecteur de période global : préréglages + plage personnalisée. */
export function PeriodSelector() {
  const { preset, range, today, setPreset, setCustomRange } = usePeriod();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
      <Select
        items={PERIOD_PRESETS}
        value={preset}
        onValueChange={(value) => {
          if (!value) return;
          if (value === "custom" && range) {
            // On part de la période affichée pour ne pas sauter à une plage vide.
            setCustomRange(range);
          } else {
            setPreset(value as PeriodPreset);
          }
        }}
      >
        <SelectTrigger aria-label="Période" className="min-w-0 flex-1 data-[size=default]:h-11 lg:min-w-40 lg:flex-none lg:data-[size=default]:h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          {PERIOD_PRESETS.map((item) => (
            <SelectItem key={item.value} value={item.value} className="min-h-11 lg:min-h-0">
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" && range && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <DateInput
            label="Du"
            value={range.from}
            max={range.to}
            onChange={(from) => setCustomRange({ from })}
          />
          <span aria-hidden>→</span>
          <DateInput
            label="Au"
            value={range.to}
            min={range.from}
            max={today ?? undefined}
            onChange={(to) => setCustomRange({ to })}
          />
        </div>
      )}
    </div>
  );
}

function DateInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="date"
      aria-label={label}
      value={value}
      min={min}
      max={max}
      onChange={(event) => {
        if (event.target.value) onChange(event.target.value);
      }}
      className="h-11 rounded-lg border lg:h-8 border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:[color-scheme:dark]"
    />
  );
}
