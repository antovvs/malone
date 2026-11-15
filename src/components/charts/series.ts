/**
 * Séries des graphiques. La couleur suit le TYPE de revenu, pas son rang :
 * le PPV est toujours orange, qu'il soit premier ou dernier du classement,
 * et un filtre ne recolore jamais les séries restantes.
 */

export interface SeriesDef<Key extends string = string> {
  key: Key;
  label: string;
  /** Variable CSS définie dans globals.css (valeur propre à chaque thème). */
  color: string;
}

export const REVENUE_SERIES: SeriesDef<
  "subscriptions" | "ppv" | "tips" | "push" | "other"
>[] = [
  { key: "subscriptions", label: "Abonnements", color: "var(--series-1)" },
  { key: "ppv", label: "PPV", color: "var(--series-2)" },
  { key: "tips", label: "Tips", color: "var(--series-3)" },
  { key: "push", label: "Push", color: "var(--series-4)" },
  { key: "other", label: "Autres", color: "var(--series-5)" },
];

export const SUBSCRIBER_FLOW_SERIES: SeriesDef<"newSubscribers" | "unsubscriptions">[] = [
  { key: "newSubscribers", label: "Nouveaux abonnés", color: "var(--series-1)" },
  { key: "unsubscriptions", label: "Désabonnements", color: "var(--series-2)" },
];

/** Styles communs des axes Recharts : discrets, pour laisser parler les données. */
export const AXIS_TICK = { fill: "var(--chart-muted)", fontSize: 12 } as const;
export const CHART_HEIGHT = 260;
