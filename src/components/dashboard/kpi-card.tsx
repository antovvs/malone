import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Sparkline } from "@/components/charts/sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DeltaProps {
  /** Évolution en % vs la période précédente ; null si non calculable. */
  change: number | null;
  /** Pour les métriques où une hausse est une mauvaise nouvelle (churn, remboursements). */
  invert?: boolean;
}

/**
 * Évolution vs période précédente. Le sens est porté par l'icône et le signe,
 * la couleur ne fait que le souligner (vert = bonne nouvelle, rouge = mauvaise).
 */
export function Delta({ change, invert = false }: DeltaProps) {
  if (change === null) {
    return <span className="text-xs text-muted-foreground">— vs période préc.</span>;
  }

  const flat = Math.abs(change) < 0.05;
  const good = invert ? change < 0 : change > 0;
  const Icon = flat ? Minus : change > 0 ? TrendingUp : TrendingDown;

  return (
    <span className="flex flex-wrap items-center gap-x-1.5 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-1 font-medium tabular-nums",
          flat ? "text-muted-foreground" : good ? "text-(--delta-up)" : "text-(--delta-down)",
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {change > 0 ? "+" : ""}
        {formatPct(change)}
      </span>
      <span className="text-muted-foreground">vs période préc.</span>
    </span>
  );
}

interface KpiCardProps extends Partial<DeltaProps> {
  label: string;
  /** Valeur déjà formatée ; null = donnée indisponible. */
  value: string | null;
  /** Précision sous la valeur (ex. « 5 achetés / 49 envoyés »). */
  hint?: string;
  /** Sans comparaison possible (stock instantané…) : on masque l'évolution. */
  hideDelta?: boolean;
  loading?: boolean;
  /** Tuile principale : valeur plus grande. */
  hero?: boolean;
  /** Valeurs jour par jour pour la mini-courbe de tendance (optionnel). */
  trend?: (number | null)[];
  className?: string;
}

/** Tuile d'indicateur : libellé, valeur, évolution. */
export function KpiCard({
  label,
  value,
  hint,
  change = null,
  invert,
  hideDelta = false,
  loading = false,
  hero = false,
  trend,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        className,
      )}
    >
      <p className="truncate text-sm text-muted-foreground">{label}</p>
      {loading ? (
        <>
          <Skeleton className={hero ? "h-10 w-40" : "h-8 w-24"} />
          <Skeleton className="h-4 w-32" />
        </>
      ) : (
        <>
          <p
            className={cn(
              "truncate font-semibold tracking-tight",
              hero ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
              value === null && "text-muted-foreground",
            )}
          >
            {value ?? "—"}
          </p>
          {!hideDelta && <Delta change={change} invert={invert} />}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          {trend && (
            <div className="mt-auto">
              <Sparkline values={trend} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
