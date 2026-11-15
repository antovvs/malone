import { formatDayLong } from "@/lib/format";

interface TooltipEntry {
  name?: unknown;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
}

interface ChartTooltipProps {
  // Injectés par Recharts.
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: unknown;
  // Fournis par nous.
  formatValue: (value: number) => string;
  /** Ajoute une ligne « Total » (barres empilées). */
  showTotal?: boolean;
}

/** Infobulle commune à tous les graphiques : date, puis une ligne par série. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  showTotal = false,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const rows = payload.filter((entry) => typeof entry.value === "number");
  const total = rows.reduce((sum, entry) => sum + (entry.value as number), 0);

  return (
    <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1.5 font-medium">
        {typeof label === "string" ? formatDayLong(label) : String(label ?? "")}
      </p>
      <ul className="flex flex-col gap-1">
        {rows.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2">
            <span
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="flex-1 text-muted-foreground">{String(entry.name ?? "")}</span>
            <span className="font-medium tabular-nums">{formatValue(entry.value as number)}</span>
          </li>
        ))}
      </ul>
      {showTotal && rows.length > 1 && (
        <p className="mt-1.5 flex justify-between gap-4 border-t pt-1.5 font-medium">
          <span>Total</span>
          <span className="tabular-nums">{formatValue(total)}</span>
        </p>
      )}
    </div>
  );
}
