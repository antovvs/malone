/** Formatage à la française des montants, nombres et dates du dashboard. */

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eurCompact = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const int = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

const pct = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatEur(value: number): string {
  return eur.format(value);
}

/** Montant arrondi à l'euro, pour les axes de graphique. */
export function formatEurCompact(value: number): string {
  return eurCompact.format(value);
}

export function formatInt(value: number): string {
  return int.format(value);
}

export function formatPct(value: number): string {
  return `${pct.format(value)} %`;
}

/** « 2026-11-14 » → « 14/11 » (axes). */
export function formatDayShort(day: string): string {
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

/** « 2026-11-14 » → « 14 nov. 2026 ». */
export function formatDayLong(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
