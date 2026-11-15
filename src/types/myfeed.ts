/**
 * Types de l'API MyFeed.
 *
 * Les formes ci-dessous reprennent les réponses réelles des outils MyFeed
 * (list_models, get_revenue, get_sales…). Rappels métier :
 *  - les montants `*_eur` sont en euros NET (ce que MYM reverse à la modèle),
 *    sauf get_pushes (brut) et get_balance (devise du compte) ;
 *  - les dates sont des jours de Paris au format AAAA-MM-JJ ;
 *  - toutes les listes sont paginées (has_more / next_offset).
 */

export interface DateRange {
  /** Premier jour inclus, AAAA-MM-JJ. */
  from: string;
  /** Dernier jour inclus, AAAA-MM-JJ. */
  to: string;
}

/** Enveloppe commune à toutes les listes renvoyées par MyFeed. */
export interface MyFeedList<T> {
  data: T[];
  total_rows?: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
  next_offset?: number | null;
  period?: DateRange;
  currency?: string;
  amounts?: "net" | "gross";
  /** Ajouté par notre proxy quand la pagination automatique a été plafonnée. */
  truncated?: boolean;
}

/** get_me : identité de la clé et droits accordés. */
export interface MyFeedMe {
  data: {
    key: {
      id: number;
      name: string;
      access: string;
      kind: string;
      scopes: string[];
    };
    models_count: number;
  };
}

/** Un compte MYM géré par l'agence. */
export interface Model {
  id: number;
  username: string;
  active: boolean;
  archived: boolean;
}

export interface Chatter {
  id: number;
  name: string;
  model_ids: number[];
}

/** get_revenue by=day : une ligne par modèle et par jour. */
export interface RevenueDayRow {
  model_id: number;
  model: string;
  date: string;
  total_eur: number;
  subscriptions_eur: number;
  ppv_eur: number;
  tips_eur: number;
  push_eur: number;
  media_on_demand_eur: number;
  affiliate_eur: number;
  /**
   * Toutes les transactions MYM du jour, y compris celles à 0 € (abonnement
   * gratuit, par exemple). C'est donc bien plus large que le nombre de ventes.
   */
  transactions: number;
}

export type SaleType = "ppv" | "tip" | "push" | "subscription" | (string & {});

/** get_sales : une vente. */
export interface Sale {
  sale_id: number;
  model_id: number;
  model: string;
  date: string;
  time: string;
  sold_at: string;
  fan: string;
  type: SaleType;
  sale_eur: number;
  /** Part revenant au chatteur quand la vente est partagée. */
  part_eur: number;
  chatter_id: number | null;
  chatter_name: string | null;
  kind: string;
  shared_with_id: number | null;
  shared_with: string | null;
  made_with_ai: boolean;
  mym_reference: string | null;
}

/** get_subscribers : compteurs d'abonnés d'un modèle pour un jour. */
export interface SubscriberDayRow {
  date: string;
  model_id: number;
  model: string;
  new_subscribers: number;
  new_paid: number;
  new_free: number;
  renewals: number;
  /** Compteurs MYM, absents avant leur mise en place côté MyFeed. */
  active_subscribers: number | null;
  ex_subscribers: number | null;
  interested: number | null;
  active_change: number | null;
  unsubscriptions_net: number | null;
  counted_at?: string | null;
}

/** get_ppv_conversion by=chatter. */
export interface PpvConversionRow {
  chatter_id: number;
  chatter_name: string;
  /** Tous les médias envoyés, gratuits compris. */
  sent_total: number;
  /** PPV payants envoyés : le dénominateur du vrai taux de conversion. */
  sent_paid: number;
  sent_free: number;
  bought: number;
  refused: number;
  conversion_paid_pct: number;
  avg_price_sent_eur: number | null;
  avg_price_bought_eur: number | null;
  bought_price_eur: number;
  made_with_ai: number;
}

/** get_pushes : un push MYM (montants BRUTS). */
export interface Push {
  push_id: string;
  model_id: number;
  model: string;
  date: string;
  time: string;
  published_at: string;
  caption: string;
  audience: string;
  currency: string;
  price: number;
  promo_price: number | null;
  media_count: number;
  recipients: number;
  views: number;
  purchases: number;
  revenue_gross: number;
}

/** get_chatter_sales by=chatter. */
export interface ChatterSalesRow {
  chatter_id: number | null;
  chatter_name: string;
  kind: string;
  model_ids: number[];
  sales_count: number;
  ppv_eur: number;
  tips_eur: number;
  other_eur: number;
  total_eur: number;
  ai_eur: number;
}
