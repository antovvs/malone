"use client";

import { useMemo } from "react";
import { CircleAlert, KeyRound } from "lucide-react";

import {
  RevenueBreakdownChart,
  RevenueTrendChart,
} from "@/components/charts/revenue-charts";
import {
  ActiveSubscribersChart,
  SubscriberFlowChart,
} from "@/components/charts/subscriber-charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  AlertBanner,
  RecommendationList,
} from "@/components/recommendations/recommendation-list";
import { useDataMode, useMyFeed } from "@/hooks/use-myfeed";
import { usePeriod } from "@/hooks/use-period";
import {
  arpu,
  daysSinceLastSale,
  pctChange,
  ppvTotals,
  revenueByDay,
  revenueTotals,
  salesByDay,
  salesTotals,
  subscribersByDay,
  subscriberTotals,
} from "@/lib/analytics";
import { formatDayLong, formatEur, formatInt, formatPct } from "@/lib/format";
import { addDays, daysInRange } from "@/lib/period";
import { buildRecommendations } from "@/lib/recommendations";
import type {
  Chatter,
  ChatterSalesRow,
  MyFeedList,
  PpvConversionRow,
  Push,
  RevenueDayRow,
  Sale,
  SubscriberDayRow,
} from "@/types/myfeed";

/** Suivre toute la pagination : un total calculé sur une seule page serait faux. */
const ALL = { all: true };

/**
 * Page d'accueil : indicateurs clés, tendances et points à améliorer.
 *
 * Trois fenêtres de dates coexistent :
 *  - `range`    la période choisie → indicateurs clés ;
 *  - `previous` même durée juste avant → évolutions en % ;
 *  - `trend`    30 jours au minimum → courbes (elle contient toujours `range`).
 */
export function DashboardHome() {
  const { today, range, previous, trend, modelId } = usePeriod();
  const dataMode = useDataMode();
  const scope = { model_id: modelId };

  // Revenus et abonnés : on charge la fenêtre de tendance, puis on en extrait la période.
  const revenue = useMyFeed<MyFeedList<RevenueDayRow>>(
    trend ? "get_revenue" : null,
    { ...trend, by: "day", limit: 500, ...scope },
    ALL,
  );
  const previousRevenue = useMyFeed<MyFeedList<RevenueDayRow>>(
    previous ? "get_revenue" : null,
    { ...previous, by: "day", limit: 500, ...scope },
    ALL,
  );
  const subscribers = useMyFeed<MyFeedList<SubscriberDayRow>>(
    trend ? "get_subscribers" : null,
    { ...trend, limit: 500, ...scope },
    ALL,
  );
  const previousSubscribers = useMyFeed<MyFeedList<SubscriberDayRow>>(
    previous ? "get_subscribers" : null,
    { ...previous, limit: 500, ...scope },
    ALL,
  );
  const sales = useMyFeed<MyFeedList<Sale>>(
    range ? "get_sales" : null,
    { ...range, limit: 1000, ...scope },
    ALL,
  );
  const previousSales = useMyFeed<MyFeedList<Sale>>(
    previous ? "get_sales" : null,
    { ...previous, limit: 1000, ...scope },
    ALL,
  );
  const ppv = useMyFeed<MyFeedList<PpvConversionRow>>(
    range ? "get_ppv_conversion" : null,
    { ...range, limit: 500, ...scope },
    ALL,
  );
  const previousPpv = useMyFeed<MyFeedList<PpvConversionRow>>(
    previous ? "get_ppv_conversion" : null,
    { ...previous, limit: 500, ...scope },
    ALL,
  );
  // Push des 7 derniers jours (indépendant de la période) : seul le nombre nous intéresse.
  const pushes = useMyFeed<MyFeedList<Push>>(today ? "get_pushes" : null, {
    from: today ? addDays(today, -6) : null,
    to: today,
    limit: 1,
    ...scope,
  });
  const chatters = useMyFeed<MyFeedList<Chatter>>("list_chatters", { limit: 500, ...scope }, ALL);
  const chatterSales = useMyFeed<MyFeedList<ChatterSalesRow>>(
    range ? "get_chatter_sales" : null,
    { ...range, limit: 500, ...scope },
    ALL,
  );

  /* ---------------------------- Séries par jour ---------------------------- */

  const trendRevenue = useMemo(
    () => (revenue.data && trend ? revenueByDay(revenue.data.data, trend) : undefined),
    [revenue.data, trend],
  );
  const trendSubscribers = useMemo(
    () => (subscribers.data && trend ? subscribersByDay(subscribers.data.data, trend) : undefined),
    [subscribers.data, trend],
  );

  /* ---------------------------- Mini-courbes ------------------------------ */

  // Une mini-courbe couvre la période choisie si elle fait au moins 7 jours ;
  // en dessous (aujourd'hui, par exemple) elle montre les 30 jours de tendance.
  const spark = useMemo(() => {
    if (!range || !trend) return null;
    const longEnough = daysInRange(range) >= 7;
    const span = longEnough ? range : trend;
    const within = <T extends { date: string }>(days: T[] | undefined) =>
      days?.filter((day) => day.date >= span.from && day.date <= span.to);
    const revenueDays = within(trendRevenue);
    const subscriberDays = within(trendSubscribers);
    // Les ventes ne sont chargées que pour la période : pas de courbe si elle est trop courte.
    const saleDays = sales.data && longEnough ? salesByDay(sales.data.data, range) : undefined;
    return {
      revenue: revenueDays?.map((day) => day.total),
      sales: saleDays?.map((day) => day.count),
      basket: saleDays?.map((day) => day.basket),
      newSubscribers: subscriberDays?.map((day) => day.newSubscribers),
      active: subscriberDays?.map((day) => day.active),
    };
  }, [range, trend, trendRevenue, trendSubscribers, sales.data]);

  /* ------------------------------ Totaux ---------------------------------- */

  const totals = useMemo(() => {
    const rev =
      revenue.data && range ? revenueTotals(revenueByDay(revenue.data.data, range)) : undefined;
    const prevRev =
      previousRevenue.data && previous
        ? revenueTotals(revenueByDay(previousRevenue.data.data, previous))
        : undefined;
    const subs =
      subscribers.data && range
        ? subscriberTotals(subscribersByDay(subscribers.data.data, range))
        : undefined;
    const prevSubs =
      previousSubscribers.data && previous
        ? subscriberTotals(subscribersByDay(previousSubscribers.data.data, previous))
        : undefined;
    return {
      rev,
      prevRev,
      subs,
      prevSubs,
      sales: sales.data ? salesTotals(sales.data.data) : undefined,
      prevSales: previousSales.data ? salesTotals(previousSales.data.data) : undefined,
      ppv: ppv.data ? ppvTotals(ppv.data.data) : undefined,
      prevPpv: previousPpv.data ? ppvTotals(previousPpv.data.data) : undefined,
    };
  }, [
    range,
    previous,
    revenue.data,
    previousRevenue.data,
    subscribers.data,
    previousSubscribers.data,
    sales.data,
    previousSales.data,
    ppv.data,
    previousPpv.data,
  ]);

  /* -------------------------- Points à améliorer -------------------------- */

  const recommendations = useMemo(() => {
    const { rev, prevRev, subs, sales: salesNow, prevSales, ppv: ppvNow } = totals;
    if (
      !rev || !subs || !salesNow || !ppvNow || !trendRevenue ||
      !pushes.data || !chatters.data || !chatterSales.data || !range
    ) {
      return undefined;
    }

    // Chatteurs de l'équipe sans aucune vente attribuée sur la période.
    const sellers = new Set(
      chatterSales.data.data.filter((row) => row.sales_count > 0).map((row) => row.chatter_id),
    );
    const chattersWithoutSale = chatters.data.data
      .filter((chatter) => !sellers.has(chatter.id))
      .map((chatter) => chatter.name);

    return buildRecommendations({
      revenue: rev,
      previousRevenue: prevRev ?? null,
      sales: salesNow,
      previousSales: prevSales ?? null,
      subscribers: subs,
      ppv: ppvNow,
      pushesLast7Days: pushes.data.total_rows ?? pushes.data.data.length,
      chattersWithoutSale,
      // « Depuis combien de jours sans vente » n'a de sens que si la période va jusqu'à aujourd'hui.
      daysSinceLastSale:
        range.to === today ? daysSinceLastSale(trendRevenue) : rev.total > 0 ? 0 : null,
    });
  }, [totals, trendRevenue, pushes.data, chatters.data, chatterSales.data, range, today]);

  /* ------------------------------- Rendu ---------------------------------- */

  const queries = [
    revenue, previousRevenue, subscribers, previousSubscribers, sales,
    previousSales, ppv, previousPpv, pushes, chatters, chatterSales,
  ];
  const errors = [...new Set(queries.flatMap((query) => (query.error ? [query.error] : [])))];

  const { rev, prevRev, subs, prevSubs, prevSales, prevPpv } = totals;
  const currentArpu = rev && subs ? arpu(rev.total, subs.active) : null;
  const previousArpu = prevRev && prevSubs ? arpu(prevRev.total, prevSubs.active) : null;

  const trendLabel = trend ? `Du ${formatDayLong(trend.from)} au ${formatDayLong(trend.to)}` : "";
  // Tant qu'une requête tourne (ou que le navigateur n'a pas pris la main), on montre des squelettes.
  const pending = (...states: { data: unknown; error: unknown }[]) =>
    states.some((state) => state.data === undefined && !state.error);

  // Ni clé API ni mode démo : un état vide clair plutôt qu'une pluie d'erreurs.
  if (dataMode === "unconfigured") return <Unconfigured />;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 min-h-5 text-sm text-muted-foreground">
          {range && previous && (
            <>
              Du {formatDayLong(range.from)} au {formatDayLong(range.to)}
              {daysInRange(range) > 1 ? ` (${daysInRange(range)} jours)` : ""} · comparé au{" "}
              {formatDayLong(previous.from)} → {formatDayLong(previous.to)}
            </>
          )}
        </p>
      </header>

      {errors.length > 0 && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium">Certaines données MyFeed n&apos;ont pas pu être chargées</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {recommendations && <AlertBanner items={recommendations} />}

      <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          hero
          className="col-span-2"
          label="CA net"
          loading={pending(revenue, previousRevenue)}
          value={rev ? formatEur(rev.total) : null}
          change={pctChange(rev?.total, prevRev?.total)}
          hint={prevRev ? `${formatEur(prevRev.total)} sur la période précédente` : undefined}
          trend={spark?.revenue}
        />
        <KpiCard
          label="Ventes"
          loading={pending(sales, previousSales)}
          value={totals.sales ? formatInt(totals.sales.count) : null}
          change={pctChange(totals.sales?.count, prevSales?.count)}
          trend={spark?.sales}
        />
        <KpiCard
          label="Panier moyen"
          loading={pending(sales, previousSales)}
          value={totals.sales?.averageBasket != null ? formatEur(totals.sales.averageBasket) : null}
          change={pctChange(totals.sales?.averageBasket, prevSales?.averageBasket)}
          trend={spark?.basket}
        />
        <KpiCard
          label="Nouveaux abonnés"
          loading={pending(subscribers, previousSubscribers)}
          value={subs ? formatInt(subs.newSubscribers) : null}
          change={pctChange(subs?.newSubscribers, prevSubs?.newSubscribers)}
          hint={subs ? `${formatInt(subs.newPaid)} payants · ${formatInt(subs.newFree)} gratuits` : undefined}
          trend={spark?.newSubscribers}
        />
        <KpiCard
          label="Abonnés actifs"
          loading={pending(subscribers, previousSubscribers)}
          value={subs?.active != null ? formatInt(subs.active) : null}
          change={pctChange(subs?.active, prevSubs?.active)}
          trend={spark?.active}
        />
        <KpiCard
          label="Conversion PPV"
          loading={pending(ppv, previousPpv)}
          value={totals.ppv?.conversionPct != null ? formatPct(totals.ppv.conversionPct) : null}
          change={pctChange(totals.ppv?.conversionPct, prevPpv?.conversionPct)}
          hint={
            totals.ppv
              ? `${formatInt(totals.ppv.bought)} achetés / ${formatInt(totals.ppv.sentPaid)} payants envoyés`
              : undefined
          }
        />
        <KpiCard
          label="ARPU"
          hint="Revenu net par abonné actif"
          loading={pending(revenue, previousRevenue, subscribers, previousSubscribers)}
          value={currentArpu !== null ? formatEur(currentArpu) : null}
          change={pctChange(currentArpu, previousArpu)}
        />
      </section>

      {sales.data?.truncated && (
        <p className="text-xs text-muted-foreground">
          Période très chargée : seules les {formatInt(sales.data.data.length)} premières ventes
          ont été chargées, le nombre de ventes et le panier moyen sont donc partiels.
        </p>
      )}

      <section aria-label="Tendances" className="grid gap-4 lg:grid-cols-2">
        <RevenueTrendChart
          days={trendRevenue}
          description={trendLabel}
          loading={pending(revenue)}
        />
        <RevenueBreakdownChart
          days={trendRevenue}
          description={trendLabel}
          loading={pending(revenue)}
        />
        <ActiveSubscribersChart
          days={trendSubscribers}
          description={trendLabel}
          loading={pending(subscribers)}
        />
        <SubscriberFlowChart
          days={trendSubscribers}
          description={trendLabel}
          loading={pending(subscribers)}
        />
      </section>

      <section aria-labelledby="improve-title" className="flex flex-col gap-3">
        <div>
          <h2 id="improve-title" className="text-base font-semibold tracking-tight">
            Points à améliorer
          </h2>
          <p className="text-sm text-muted-foreground">
            Générés automatiquement à partir des chiffres de la période.
          </p>
        </div>
        {recommendations || errors.length === 0 ? (
          <RecommendationList items={recommendations ?? []} loading={!recommendations} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Analyse indisponible tant que toutes les données ne sont pas chargées.
          </p>
        )}
      </section>
    </div>
  );
}

/** Affiché quand le serveur n'a ni clé API MyFeed ni mode démo. */
function Unconfigured() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border bg-card">
        <KeyRound className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Aucune source de données</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La clé API MyFeed n&apos;est pas configurée sur le serveur. Renseignez{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">MYFEED_API_KEY</code> dans les
          variables d&apos;environnement, puis rechargez la page.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pour découvrir l&apos;interface sans clé :{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">MYFEED_DEMO=1</code>.
        </p>
      </div>
    </div>
  );
}
