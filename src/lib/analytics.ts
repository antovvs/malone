import { eachDay } from "@/lib/period";
import type {
  DateRange,
  PpvConversionRow,
  RevenueDayRow,
  Sale,
  SubscriberDayRow,
} from "@/types/myfeed";

/**
 * Métriques dérivées. Fonctions pures : elles prennent les lignes brutes de
 * MyFeed et renvoient les chiffres affichés (agrégation multi-modèles, ARPU,
 * panier moyen, évolution…). Aucune ne fait d'appel réseau.
 */

/** CA net d'un jour, tous modèles confondus, ventilé par type de revenu. */
export interface RevenueDay {
  date: string;
  total: number;
  subscriptions: number;
  ppv: number;
  tips: number;
  push: number;
  /** Médias à la demande + parrainage, regroupés car marginaux. */
  other: number;
  transactions: number;
}

export type RevenueTotals = Omit<RevenueDay, "date">;

const EMPTY_REVENUE: RevenueTotals = {
  total: 0,
  subscriptions: 0,
  ppv: 0,
  tips: 0,
  push: 0,
  other: 0,
  transactions: 0,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Une ligne par jour de la période, tous modèles additionnés.
 * Les jours sans ligne MyFeed valent 0 : un jour sans vente doit apparaître
 * comme un creux sur la courbe, pas disparaître de l'axe.
 */
export function revenueByDay(rows: RevenueDayRow[], range: DateRange): RevenueDay[] {
  const byDate = new Map<string, RevenueDay>(
    eachDay(range).map((date) => [date, { date, ...EMPTY_REVENUE }]),
  );
  for (const row of rows) {
    const day = byDate.get(row.date);
    if (!day) continue;
    day.total += row.total_eur;
    day.subscriptions += row.subscriptions_eur;
    day.ppv += row.ppv_eur;
    day.tips += row.tips_eur;
    day.push += row.push_eur;
    day.other += row.media_on_demand_eur + row.affiliate_eur;
    day.transactions += row.transactions;
  }
  return [...byDate.values()].map((day) => ({
    ...day,
    total: round2(day.total),
    subscriptions: round2(day.subscriptions),
    ppv: round2(day.ppv),
    tips: round2(day.tips),
    push: round2(day.push),
    other: round2(day.other),
  }));
}

export function revenueTotals(days: RevenueDay[]): RevenueTotals {
  const totals = { ...EMPTY_REVENUE };
  for (const day of days) {
    totals.total += day.total;
    totals.subscriptions += day.subscriptions;
    totals.ppv += day.ppv;
    totals.tips += day.tips;
    totals.push += day.push;
    totals.other += day.other;
    totals.transactions += day.transactions;
  }
  return {
    ...totals,
    total: round2(totals.total),
    subscriptions: round2(totals.subscriptions),
    ppv: round2(totals.ppv),
    tips: round2(totals.tips),
    push: round2(totals.push),
    other: round2(totals.other),
  };
}

/** Abonnés d'un jour, tous modèles confondus. */
export interface SubscribersDay {
  date: string;
  newSubscribers: number;
  newPaid: number;
  newFree: number;
  /** Désabonnements du jour. */
  unsubscriptions: number;
  /** Total d'abonnés actifs en fin de journée ; null si MYM ne l'a pas encore compté. */
  active: number | null;
}

export function subscribersByDay(
  rows: SubscriberDayRow[],
  range: DateRange,
): SubscribersDay[] {
  const byDate = new Map<string, SubscribersDay>(
    eachDay(range).map((date) => [
      date,
      { date, newSubscribers: 0, newPaid: 0, newFree: 0, unsubscriptions: 0, active: null },
    ]),
  );
  for (const row of rows) {
    const day = byDate.get(row.date);
    if (!day) continue;
    day.newSubscribers += row.new_subscribers;
    day.newPaid += row.new_paid;
    day.newFree += row.new_free;
    day.unsubscriptions += row.unsubscriptions_net ?? 0;
    if (row.active_subscribers != null) {
      day.active = (day.active ?? 0) + row.active_subscribers;
    }
  }
  return [...byDate.values()];
}

export interface SubscriberTotals {
  newSubscribers: number;
  newPaid: number;
  newFree: number;
  unsubscriptions: number;
  /** Dernier total d'actifs connu sur la période (c'est un stock, pas un flux). */
  active: number | null;
}

export function subscriberTotals(days: SubscribersDay[]): SubscriberTotals {
  const totals: SubscriberTotals = {
    newSubscribers: 0,
    newPaid: 0,
    newFree: 0,
    unsubscriptions: 0,
    active: null,
  };
  for (const day of days) {
    totals.newSubscribers += day.newSubscribers;
    totals.newPaid += day.newPaid;
    totals.newFree += day.newFree;
    totals.unsubscriptions += day.unsubscriptions;
    if (day.active != null) totals.active = day.active;
  }
  return totals;
}

export interface PpvTotals {
  /** PPV payants envoyés. */
  sentPaid: number;
  bought: number;
  /** Achetés ÷ payants envoyés, en %. null si aucun PPV payant envoyé. */
  conversionPct: number | null;
}

/**
 * Vrai taux de conversion PPV : on ne compte que les PPV PAYANTS envoyés.
 * Inclure les médias gratuits au dénominateur écraserait le taux.
 */
export function ppvTotals(rows: PpvConversionRow[]): PpvTotals {
  let sentPaid = 0;
  let bought = 0;
  for (const row of rows) {
    sentPaid += row.sent_paid;
    bought += row.bought;
  }
  return {
    sentPaid,
    bought,
    conversionPct: sentPaid > 0 ? (bought / sentPaid) * 100 : null,
  };
}

export interface SalesTotals {
  count: number;
  total: number;
  /** Panier moyen : CA des ventes ÷ nombre de ventes. null sans vente. */
  averageBasket: number | null;
}

export function salesTotals(sales: Sale[]): SalesTotals {
  const total = round2(sales.reduce((sum, sale) => sum + sale.sale_eur, 0));
  return {
    count: sales.length,
    total,
    averageBasket: sales.length > 0 ? total / sales.length : null,
  };
}

/** Nombre de ventes et panier moyen de chaque jour de la période. */
export function salesByDay(
  sales: Sale[],
  range: DateRange,
): { date: string; count: number; basket: number | null }[] {
  const byDate = new Map(eachDay(range).map((date) => [date, { count: 0, total: 0 }]));
  for (const sale of sales) {
    const day = byDate.get(sale.date);
    if (!day) continue;
    day.count += 1;
    day.total += sale.sale_eur;
  }
  return [...byDate].map(([date, day]) => ({
    date,
    count: day.count,
    basket: day.count > 0 ? day.total / day.count : null,
  }));
}

/**
 * Évolution en % entre deux valeurs. null quand la base est nulle ou inconnue :
 * passer de 0 € à 100 € n'est pas « +∞ % », on affiche alors « — ».
 */
export function pctChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** ARPU : revenu net de la période par abonné actif. */
export function arpu(revenue: number, activeSubscribers: number | null): number | null {
  if (!activeSubscribers) return null;
  return revenue / activeSubscribers;
}

/** Nombre de jours écoulés depuis la dernière vente de la série (0 = vente aujourd'hui). */
export function daysSinceLastSale(days: RevenueDay[]): number | null {
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].total > 0) return days.length - 1 - i;
  }
  return null;
}
