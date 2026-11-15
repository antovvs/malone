import { CircleAlert, Info, PartyPopper, TriangleAlert, type LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { Recommendation, Severity } from "@/lib/recommendations";
import { cn } from "@/lib/utils";

const SEVERITY: Record<Severity, { label: string; icon: LucideIcon; className: string }> = {
  critical: { label: "Critique", icon: CircleAlert, className: "text-(--status-critical)" },
  warning: { label: "À surveiller", icon: TriangleAlert, className: "text-(--status-warning)" },
  info: { label: "Piste", icon: Info, className: "text-muted-foreground" },
};

/** Bandeau d'alertes en haut du dashboard : uniquement les points critiques. */
export function AlertBanner({ items }: { items: Recommendation[] }) {
  const critical = items.filter((item) => item.severity === "critical");
  if (critical.length === 0) return null;

  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-(--status-critical)/40 bg-(--status-critical)/10 p-4"
    >
      <CircleAlert className="mt-0.5 size-5 shrink-0 text-(--status-critical)" aria-hidden />
      <div className="min-w-0 text-sm">
        <p className="font-medium">
          {critical.length === 1 ? "1 alerte importante" : `${critical.length} alertes importantes`}
        </p>
        <ul className="mt-1 space-y-0.5 text-muted-foreground">
          {critical.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Section « Points à améliorer » : toutes les recommandations, les plus graves d'abord. */
export function RecommendationList({
  items,
  loading,
}: {
  items: Recommendation[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
        <PartyPopper className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <p>Rien à signaler sur cette période : aucun de nos contrôles ne s&apos;est déclenché.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((item) => {
        const severity = SEVERITY[item.severity];
        return (
          <li
            key={item.id}
            className="flex gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <severity.icon
              className={cn("mt-0.5 size-5 shrink-0", severity.className)}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{severity.label}</p>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
