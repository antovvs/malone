import type { DateRange } from "@/types/myfeed";

/**
 * Calculs de dates. MyFeed raisonne en « jours de Paris » (AAAA-MM-JJ) :
 * une vente faite à 00h30 à Paris compte pour le nouveau jour, quel que soit
 * le fuseau du navigateur. On manipule donc des chaînes AAAA-MM-JJ et on ne
 * fait l'arithmétique qu'en UTC pour éviter tout décalage d'heure d'été.
 */

export type PeriodPreset =
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "last_month"
  | "custom";

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "month", label: "Ce mois" },
  { value: "last_month", label: "Mois dernier" },
  { value: "custom", label: "Personnalisé" },
];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(value: unknown): value is string {
  return typeof value === "string" && ISO_DAY.test(value);
}

/** Le jour en cours à Paris, AAAA-MM-JJ. */
export function todayParis(): string {
  // Le format « en-CA » donne directement AAAA-MM-JJ.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
    new Date(),
  );
}

function toUtc(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

export function addDays(day: string, n: number): string {
  return fromUtc(toUtc(day) + n * DAY_MS);
}

/** Nombre de jours d'une période, bornes incluses. */
export function daysInRange(range: DateRange): number {
  return Math.round((toUtc(range.to) - toUtc(range.from)) / DAY_MS) + 1;
}

/** Tous les jours d'une période, dans l'ordre. */
export function eachDay(range: DateRange): string[] {
  const days: string[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) days.push(d);
  return days;
}

export function resolvePeriod(
  preset: PeriodPreset,
  today: string,
  custom?: Partial<DateRange>,
): DateRange {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "last_month": {
      const lastDay = addDays(`${today.slice(0, 7)}-01`, -1);
      return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay };
    }
    case "custom": {
      if (isIsoDay(custom?.from) && isIsoDay(custom?.to) && custom.from <= custom.to) {
        // MyFeed refuse plus de 366 jours par appel et ne connaît pas le futur.
        const to = custom.to > today ? today : custom.to;
        const earliest = addDays(to, -365);
        const from = custom.from > to ? to : custom.from;
        return { from: from < earliest ? earliest : from, to };
      }
      return { from: addDays(today, -29), to: today };
    }
  }
}

/**
 * Période de comparaison : même durée, juste avant `from`.
 * Ex. 08→14 nov. se compare à 01→07 nov. C'est la convention de MyFeed
 * (compare_to=previous_period), ce qui garde nos chiffres alignés sur les siens.
 */
export function previousPeriod(range: DateRange): DateRange {
  const length = daysInRange(range);
  const to = addDays(range.from, -1);
  return { from: addDays(to, -(length - 1)), to };
}

/**
 * Fenêtre des graphiques de tendance : au moins 30 jours, pour qu'une courbe
 * reste lisible même quand la période choisie est « aujourd'hui » ou « 7 jours ».
 */
export function trendRange(range: DateRange): DateRange {
  if (daysInRange(range) >= 30) return range;
  return { from: addDays(range.to, -29), to: range.to };
}
