import type {
  PpvTotals,
  RevenueTotals,
  SalesTotals,
  SubscriberTotals,
} from "@/lib/analytics";
import { pctChange } from "@/lib/analytics";
import { formatEur, formatInt, formatPct } from "@/lib/format";

/**
 * Moteur de recommandations : des règles simples, lisibles et ajustables, qui
 * transforment les chiffres de la période en « points à améliorer ».
 * Chaque règle est indépendante ; pour en ajouter une, pousser un objet
 * `Recommendation` dans la liste.
 */

export type Severity = "critical" | "warning" | "info";

export interface Recommendation {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

/** Seuils métier, regroupés ici pour être faciles à régler. */
export const THRESHOLDS = {
  /** En dessous de ce taux, les PPV payants sont jugés mal ciblés ou trop chers. */
  ppvConversionPct: 5,
  /** Il faut un minimum d'envois pour que le taux ait un sens. */
  ppvMinSent: 10,
  /** Baisse de CA à partir de laquelle l'alerte devient critique. */
  revenueDropCriticalPct: 25,
  /** Part des transactions à 0 € au-delà de laquelle on le signale. */
  zeroRevenueTransactionShare: 0.5,
  zeroRevenueTransactionMin: 10,
  /** Baisse du panier moyen jugée significative. */
  basketDropPct: 10,
  /** Jours consécutifs sans vente avant alerte. */
  daysWithoutSale: 2,
};

export interface RecommendationInput {
  revenue: RevenueTotals;
  previousRevenue: RevenueTotals | null;
  sales: SalesTotals;
  previousSales: SalesTotals | null;
  subscribers: SubscriberTotals;
  ppv: PpvTotals;
  /** Push envoyés sur les 7 derniers jours ; null si inconnu. */
  pushesLast7Days: number | null;
  /** Chatteurs de l'équipe n'ayant aucune vente attribuée sur la période. */
  chattersWithoutSale: string[];
  /** Jours écoulés depuis la dernière vente ; null si aucune vente sur la fenêtre observée. */
  daysSinceLastSale: number | null;
}

const ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

export function buildRecommendations(input: RecommendationInput): Recommendation[] {
  const list: Recommendation[] = [];
  const { revenue, previousRevenue, sales, previousSales, subscribers, ppv } = input;

  // 1. CA en baisse par rapport à la période précédente.
  const revenueChange = pctChange(revenue.total, previousRevenue?.total);
  if (revenueChange !== null && revenueChange < 0) {
    const drop = Math.abs(revenueChange);
    list.push({
      id: "revenue-drop",
      severity: drop >= THRESHOLDS.revenueDropCriticalPct ? "critical" : "warning",
      title: `CA en baisse de ${formatPct(drop)}`,
      detail: `${formatEur(revenue.total)} contre ${formatEur(previousRevenue!.total)} sur la période précédente. Identifier les jours sans vente et relancer les fans actifs.`,
    });
  }

  // 2. Plusieurs jours d'affilée sans aucune vente.
  if (input.daysSinceLastSale === null) {
    list.push({
      id: "no-sale",
      severity: "critical",
      title: "Aucune vente sur la période observée",
      detail: "Aucun revenu enregistré. Vérifier que les chatteurs sont actifs et que des PPV partent.",
    });
  } else if (input.daysSinceLastSale >= THRESHOLDS.daysWithoutSale) {
    list.push({
      id: "days-without-sale",
      severity: "critical",
      title: `0 vente depuis ${input.daysSinceLastSale} jours`,
      detail: "Relancer les meilleurs fans et programmer un push pour réamorcer les achats.",
    });
  }

  // 3. Taux de conversion PPV faible.
  if (
    ppv.conversionPct !== null &&
    ppv.sentPaid >= THRESHOLDS.ppvMinSent &&
    ppv.conversionPct < THRESHOLDS.ppvConversionPct
  ) {
    list.push({
      id: "ppv-conversion",
      severity: "warning",
      title: `Taux de conversion PPV faible (${formatPct(ppv.conversionPct)})`,
      detail: `${formatInt(ppv.bought)} PPV achetés sur ${formatInt(ppv.sentPaid)} payants envoyés. Revoir le pricing ou le ciblage des PPV.`,
    });
  }

  // 4. Aucun push cette semaine.
  if (input.pushesLast7Days === 0) {
    list.push({
      id: "no-push",
      severity: "warning",
      title: "Aucun push envoyé cette semaine",
      detail: "Les push sont un levier de revenus passifs : en programmer au moins un par semaine.",
    });
  }

  // 5. Beaucoup de transactions MYM sans revenu (les fans interagissent sans acheter).
  const zeroRevenue = Math.max(revenue.transactions - sales.count, 0);
  if (
    zeroRevenue >= THRESHOLDS.zeroRevenueTransactionMin &&
    zeroRevenue / revenue.transactions >= THRESHOLDS.zeroRevenueTransactionShare
  ) {
    list.push({
      id: "zero-revenue-transactions",
      severity: "info",
      title: `${formatInt(zeroRevenue)} transactions sans revenu`,
      detail: `Sur ${formatInt(revenue.transactions)} transactions, seules ${formatInt(sales.count)} ont rapporté. Les fans interagissent mais n'achètent pas : revoir les scripts de vente.`,
    });
  }

  // 6. Tous les nouveaux abonnés sont gratuits.
  if (subscribers.newSubscribers > 0 && subscribers.newPaid === 0 && revenue.subscriptions === 0) {
    list.push({
      id: "only-free-subscribers",
      severity: "info",
      title: "Aucun abonné payant",
      detail: `${formatInt(subscribers.newSubscribers)} nouveaux abonnés, tous gratuits. Envisager un abonnement payant ou un paywall progressif.`,
    });
  }

  // 7. Chatteurs sans vente.
  for (const name of input.chattersWithoutSale) {
    list.push({
      id: `chatter-no-sale-${name}`,
      severity: "warning",
      title: `${name} n'a réalisé aucune vente`,
      detail: `Aucune vente attribuée à ${name} sur la période. Vérifier son activité et revoir son approche de vente.`,
    });
  }

  // 8. Panier moyen en baisse.
  const basketChange = pctChange(sales.averageBasket, previousSales?.averageBasket);
  if (basketChange !== null && basketChange <= -THRESHOLDS.basketDropPct) {
    list.push({
      id: "basket-drop",
      severity: "info",
      title: `Panier moyen en baisse de ${formatPct(Math.abs(basketChange))}`,
      detail: `${formatEur(sales.averageBasket!)} contre ${formatEur(previousSales!.averageBasket!)}. Tester des prix plus élevés sur les PPV.`,
    });
  }

  return list.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
