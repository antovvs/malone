import "server-only";

import { addDays, daysInRange, eachDay, previousPeriod, todayParis } from "@/lib/period";
import type {
  Chatter,
  ChatterSalesRow,
  DateRange,
  Model,
  PpvConversionRow,
  Push,
  RevenueDayRow,
  Sale,
  SubscriberDayRow,
} from "@/types/myfeed";

/**
 * Jeu de données FICTIF, activé uniquement avec MYFEED_DEMO=1 (et sans clé API).
 * Il sert à développer et à montrer le dashboard sans compte MyFeed.
 * Les chiffres sont générés à partir de la date (même jour → mêmes ventes),
 * et tous les outils s'appuient sur les mêmes ventes pour rester cohérents.
 */

type Args = Record<string, string | number | boolean>;

const MODELS: Model[] = [
  { id: 1, username: "Luna_demo", active: true, archived: false },
  { id: 2, username: "Maya_demo", active: true, archived: false },
];

const CHATTERS: Chatter[] = [
  { id: 11, name: "Alex", model_ids: [1, 2] },
  { id: 12, name: "Sam", model_ids: [1] },
  // Noa n'a aucune vente : elle déclenche la recommandation « chatteur sans vente ».
  { id: 13, name: "Noa", model_ids: [2] },
];

const FANS = ["fan_nico", "fan_tom", "fan_leo", "fan_max", "fan_hugo", "fan_sacha", "fan_remi", "fan_paul"];

/** Générateur pseudo-aléatoire déterministe (mulberry32) à partir d'une graine texte. */
function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function salesForDay(date: string, model: Model): Sale[] {
  const rand = seeded(`sales:${date}:${model.id}`);
  const count = Math.floor(rand() * 7);
  const sales: Sale[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rand();
    const type = roll < 0.6 ? "ppv" : roll < 0.8 ? "tip" : roll < 0.95 ? "subscription" : "push";
    const amount =
      type === "ppv" ? 8 + rand() * 30 : type === "tip" ? 3 + rand() * 12 : type === "subscription" ? 9.99 : 12 + rand() * 10;
    // Abonnements et push ne sont pas le fruit d'une conversation : pas de chatteur.
    const who = type === "ppv" || type === "tip" ? rand() : 2;
    const eligible = CHATTERS.filter((c) => c.name !== "Noa" && c.model_ids.includes(model.id));
    const chatter = who < 0.85 ? eligible[Math.floor(rand() * eligible.length)] : null;
    const ai = who >= 0.85 && who < 1;
    const hour = 10 + Math.floor(rand() * 13);
    const minute = Math.floor(rand() * 60);
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    sales.push({
      sale_id: Number(`${date.replaceAll("-", "")}${model.id}${i}`),
      model_id: model.id,
      model: model.username,
      date,
      time,
      sold_at: `${date}T${time}:00.000Z`,
      fan: FANS[Math.floor(rand() * FANS.length)],
      type,
      sale_eur: round2(amount),
      part_eur: round2(amount),
      chatter_id: chatter?.id ?? null,
      chatter_name: chatter?.name ?? (ai ? "IA" : null),
      kind: chatter ? "chatter" : ai ? "ai" : "none",
      shared_with_id: null,
      shared_with: null,
      made_with_ai: ai,
      mym_reference: null,
    });
  }
  return sales.sort((a, b) => a.time.localeCompare(b.time));
}

function selectedModels(args: Args): Model[] {
  return args.model_id ? MODELS.filter((m) => m.id === Number(args.model_id)) : MODELS;
}

function rangeOf(args: Args): DateRange {
  const today = todayParis();
  const to = String(args.to ?? today);
  return { from: String(args.from ?? to), to: to > today ? today : to };
}

function salesIn(range: DateRange, args: Args): Sale[] {
  const models = selectedModels(args);
  return eachDay(range).flatMap((day) => models.flatMap((m) => salesForDay(day, m)));
}

function revenueRows(range: DateRange, args: Args): RevenueDayRow[] {
  return eachDay(range).flatMap((date) =>
    selectedModels(args).map((model) => {
      const sales = salesForDay(date, model);
      const sum = (type: string) =>
        round2(sales.filter((s) => s.type === type).reduce((t, s) => t + s.sale_eur, 0));
      const rand = seeded(`tx:${date}:${model.id}`);
      return {
        model_id: model.id,
        model: model.username,
        date,
        total_eur: round2(sales.reduce((t, s) => t + s.sale_eur, 0)),
        subscriptions_eur: sum("subscription"),
        ppv_eur: sum("ppv"),
        tips_eur: sum("tip"),
        push_eur: sum("push"),
        media_on_demand_eur: 0,
        affiliate_eur: 0,
        // Transactions = ventes + mouvements à 0 € (abonnements gratuits…).
        transactions: sales.length + 8 + Math.floor(rand() * 20),
      };
    }),
  );
}

const SUBSCRIBERS_EPOCH = "2026-01-01";
const subscriberCache = new Map<string, SubscriberDayRow>();

/** Compteurs d'abonnés : cumul déterministe depuis une date d'origine. */
function subscriberRow(date: string, model: Model): SubscriberDayRow {
  const cacheKey = `${date}:${model.id}`;
  const cached = subscriberCache.get(cacheKey);
  if (cached) return cached;

  let active = 600 * model.id;
  let ex = 80 * model.id;
  let row: SubscriberDayRow | null = null;
  for (let day = SUBSCRIBERS_EPOCH; day <= date; day = addDays(day, 1)) {
    const rand = seeded(`subs:${day}:${model.id}`);
    const newPaid = Math.floor(rand() * 4);
    const newFree = 6 + Math.floor(rand() * 14);
    const unsub = Math.floor(rand() * 12);
    active += newPaid + newFree - unsub;
    ex += unsub;
    row = {
      date: day,
      model_id: model.id,
      model: model.username,
      new_subscribers: newPaid + newFree,
      new_paid: newPaid,
      new_free: newFree,
      renewals: Math.floor(rand() * 3),
      active_subscribers: active,
      ex_subscribers: ex,
      interested: 60 + Math.floor(rand() * 40),
      active_change: newPaid + newFree - unsub,
      unsubscriptions_net: unsub,
    };
    subscriberCache.set(`${day}:${model.id}`, row);
  }
  return row!;
}

function chatterSales(range: DateRange, args: Args): ChatterSalesRow[] {
  const sales = salesIn(range, args).filter((s) => s.chatter_id !== null);
  return CHATTERS.flatMap((chatter) => {
    const mine = sales.filter((s) => s.chatter_id === chatter.id);
    if (mine.length === 0) return [];
    const sum = (type: string) =>
      round2(mine.filter((s) => s.type === type).reduce((t, s) => t + s.sale_eur, 0));
    return [
      {
        chatter_id: chatter.id,
        chatter_name: chatter.name,
        kind: "chatter",
        model_ids: chatter.model_ids,
        sales_count: mine.length,
        ppv_eur: sum("ppv"),
        tips_eur: sum("tip"),
        other_eur: 0,
        total_eur: round2(mine.reduce((t, s) => t + s.sale_eur, 0)),
        ai_eur: 0,
      },
    ];
  });
}

function ppvConversion(range: DateRange, args: Args): PpvConversionRow[] {
  const sales = salesIn(range, args).filter((s) => s.type === "ppv");
  const days = daysInRange(range);
  return CHATTERS.filter(
    (c) => !args.model_id || c.model_ids.includes(Number(args.model_id)),
  ).map((chatter) => {
    const bought = sales.filter((s) => s.chatter_id === chatter.id);
    const rand = seeded(`ppv:${range.from}:${range.to}:${chatter.id}`);
    // Environ un PPV payant sur dix est acheté.
    const sentPaid = bought.length * 9 + Math.floor(rand() * days * 2) + (chatter.name === "Noa" ? 4 : 0);
    const sentFree = Math.floor(sentPaid * (0.8 + rand()));
    const boughtTotal = round2(bought.reduce((t, s) => t + s.sale_eur, 0));
    return {
      chatter_id: chatter.id,
      chatter_name: chatter.name,
      sent_total: sentPaid + sentFree,
      sent_paid: sentPaid,
      sent_free: sentFree,
      bought: bought.length,
      refused: Math.floor(rand() * 3),
      conversion_paid_pct: sentPaid ? Math.round((bought.length / sentPaid) * 1000) / 10 : 0,
      avg_price_sent_eur: sentPaid ? round2(18 + rand() * 10) : null,
      avg_price_bought_eur: bought.length ? round2(boughtTotal / bought.length) : null,
      bought_price_eur: boughtTotal,
      made_with_ai: 0,
    };
  });
}

function pushes(range: DateRange, args: Args): Push[] {
  return eachDay(range).flatMap((date) =>
    selectedModels(args).flatMap((model) => {
      const rand = seeded(`push:${date}:${model.id}`);
      // Environ un push tous les cinq jours par modèle.
      if (rand() > 0.2) return [];
      const recipients = 900 + Math.floor(rand() * 600);
      const purchases = Math.floor(rand() * 6);
      const price = 9.99;
      return [
        {
          push_id: `demo-${date}-${model.id}`,
          model_id: model.id,
          model: model.username,
          date,
          time: "18:00",
          published_at: `${date}T17:00:00.000Z`,
          caption: "Push de démonstration",
          audience: "subscribers",
          currency: "EUR",
          price,
          promo_price: null,
          media_count: 2,
          recipients,
          views: Math.floor(recipients * (0.25 + rand() * 0.2)),
          purchases,
          revenue_gross: round2(purchases * price),
        },
      ];
    }),
  );
}

/** Applique offset/limit comme le fait MyFeed. */
function paginate<T>(rows: T[], args: Args, extra: Record<string, unknown> = {}) {
  const offset = Number(args.offset ?? 0);
  const limit = Number(args.limit ?? 100);
  const data = rows.slice(offset, offset + limit);
  const hasMore = offset + limit < rows.length;
  return {
    data,
    ...extra,
    total_rows: rows.length,
    offset,
    limit,
    has_more: hasMore,
    next_offset: hasMore ? offset + limit : null,
  };
}

export function demoCall(tool: string, args: Args): unknown {
  const range = rangeOf(args);
  const meta = { period: range, currency: "EUR", amounts: "net" };

  switch (tool) {
    case "get_me":
      return {
        data: {
          key: { id: 0, name: "Démo", access: "read", kind: "demo", scopes: ["read:stats"] },
          models_count: MODELS.length,
        },
      };
    case "list_models":
      return paginate(MODELS, args);
    case "list_chatters":
      return paginate(
        CHATTERS.filter((c) => !args.model_id || c.model_ids.includes(Number(args.model_id))),
        args,
      );
    case "get_revenue":
      return paginate(revenueRows(range, args), args, { ...meta, by: "day" });
    case "get_sales":
      return paginate(salesIn(range, args), args, meta);
    case "get_subscribers":
      return paginate(
        eachDay(range).flatMap((day) => selectedModels(args).map((m) => subscriberRow(day, m))),
        args,
        { period: range },
      );
    case "get_chatter_sales":
      return paginate(chatterSales(range, args), args, { ...meta, by: "chatter" });
    case "get_ppv_conversion":
      return paginate(ppvConversion(range, args), args, { period: range, by: "chatter" });
    case "get_pushes":
      return paginate(pushes(range, args), args, { period: range, amounts: "gross" });
    default:
      // Les autres outils ne sont pas simulés : liste vide plutôt qu'une erreur.
      return paginate([], args, { period: range, previous: previousPeriod(range) });
  }
}
