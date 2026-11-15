"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { AXIS_TICK, CHART_HEIGHT, REVENUE_SERIES } from "@/components/charts/series";
import type { RevenueDay } from "@/lib/analytics";
import { formatDayLong, formatDayShort, formatEur, formatEurCompact } from "@/lib/format";

interface RevenueChartProps {
  days: RevenueDay[] | undefined;
  description: string;
  loading: boolean;
}

const NO_REVENUE = "Aucun revenu sur cette période.";

/** Courbe du CA net jour par jour. */
export function RevenueTrendChart({ days, description, loading }: RevenueChartProps) {
  const data = days ?? [];
  const hasRevenue = data.some((day) => day.total > 0);

  return (
    <ChartCard
      title="CA net par jour"
      description={description}
      loading={loading}
      empty={!hasRevenue && NO_REVENUE}
      table={{
        columns: ["Jour", "CA net"],
        rows: data.map((day) => [formatDayLong(day.date), formatEur(day.total)]),
      }}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            tickFormatter={formatEurCompact}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            content={<ChartTooltip formatValue={formatEur} />}
            cursor={{ stroke: "var(--chart-axis)" }}
          />
          <Area
            type="linear"
            dataKey="total"
            name="CA net"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="var(--series-1)"
            fillOpacity={0.12}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Barres empilées : d'où vient le CA (abonnements, PPV, tips, push, autres). */
export function RevenueBreakdownChart({ days, description, loading }: RevenueChartProps) {
  const data = days ?? [];
  const hasRevenue = data.some((day) => day.total > 0);

  return (
    <ChartCard
      title="Répartition du CA par type"
      description={description}
      legend={REVENUE_SERIES}
      loading={loading}
      empty={!hasRevenue && NO_REVENUE}
      table={{
        columns: ["Jour", ...REVENUE_SERIES.map((series) => series.label), "Total"],
        rows: data.map((day) => [
          formatDayLong(day.date),
          ...REVENUE_SERIES.map((series) => formatEur(day[series.key])),
          formatEur(day.total),
        ]),
      }}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT - 28}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            tickFormatter={formatEurCompact}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            content={<ChartTooltip formatValue={formatEur} showTotal />}
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          />
          {REVENUE_SERIES.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              stackId="revenue"
              fill={series.color}
              // Filet couleur de fond : sépare visuellement les segments empilés.
              stroke="var(--card)"
              strokeWidth={1}
              maxBarSize={28}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
