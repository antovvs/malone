"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import {
  AXIS_TICK,
  CHART_HEIGHT,
  SUBSCRIBER_FLOW_SERIES,
} from "@/components/charts/series";
import type { SubscribersDay } from "@/lib/analytics";
import { formatDayLong, formatDayShort, formatInt } from "@/lib/format";

interface SubscriberChartProps {
  days: SubscribersDay[] | undefined;
  description: string;
  loading: boolean;
}

/** Courbe du nombre d'abonnés actifs (un stock : la valeur de fin de journée). */
export function ActiveSubscribersChart({ days, description, loading }: SubscriberChartProps) {
  const data = days ?? [];
  const hasData = data.some((day) => day.active !== null);

  return (
    <ChartCard
      title="Abonnés actifs"
      description={description}
      loading={loading}
      empty={!hasData && "MYM n'a pas encore de compteur d'abonnés actifs sur cette période."}
      table={{
        columns: ["Jour", "Abonnés actifs"],
        rows: data.map((day) => [
          formatDayLong(day.date),
          day.active === null ? "—" : formatInt(day.active),
        ]),
      }}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayShort}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-axis)" }}
            minTickGap={28}
          />
          {/* Axe resserré autour des valeurs : on lit la pente, pas la hauteur absolue. */}
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={formatInt}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={56}
            allowDecimals={false}
          />
          <Tooltip
            content={<ChartTooltip formatValue={formatInt} />}
            cursor={{ stroke: "var(--chart-axis)" }}
          />
          <Line
            type="linear"
            dataKey="active"
            name="Abonnés actifs"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            // Jours sans compteur : on laisse un trou plutôt que d'inventer un tracé.
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Nouveaux abonnés face aux désabonnements, jour par jour. */
export function SubscriberFlowChart({ days, description, loading }: SubscriberChartProps) {
  const data = days ?? [];
  const hasData = data.some((day) => day.newSubscribers > 0 || day.unsubscriptions > 0);

  return (
    <ChartCard
      title="Nouveaux abonnés vs désabonnements"
      description={description}
      legend={SUBSCRIBER_FLOW_SERIES}
      loading={loading}
      empty={!hasData && "Aucun mouvement d'abonnés sur cette période."}
      table={{
        columns: ["Jour", "Nouveaux", "Désabonnements"],
        rows: data.map((day) => [
          formatDayLong(day.date),
          formatInt(day.newSubscribers),
          formatInt(day.unsubscriptions),
        ]),
      }}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT - 28}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayShort}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-axis)" }}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={formatInt}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={56}
            allowDecimals={false}
          />
          <Tooltip
            content={<ChartTooltip formatValue={formatInt} />}
            cursor={{ stroke: "var(--chart-axis)" }}
          />
          {SUBSCRIBER_FLOW_SERIES.map((series) => (
            <Line
              key={series.key}
              type="linear"
              dataKey={series.key}
              name={series.label}
              stroke={series.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
