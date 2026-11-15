"use client";

import { useState, type ReactNode } from "react";
import { ChartLine, Table2 } from "lucide-react";

import type { SeriesDef } from "@/components/charts/series";
import { CHART_HEIGHT } from "@/components/charts/series";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface ChartTable {
  columns: string[];
  rows: (string | number)[][];
}

interface ChartCardProps {
  title: string;
  description?: string;
  /** Légende : obligatoire dès qu'il y a plusieurs séries. */
  legend?: SeriesDef[];
  /** Les mêmes données sous forme de tableau (accessibilité, lecture précise). */
  table?: ChartTable;
  loading?: boolean;
  /** Message affiché à la place du graphique quand il n'y a rien à tracer. */
  empty?: string | false;
  children: ReactNode;
}

/** Cadre commun des graphiques : titre, légende, bascule graphique / tableau. */
export function ChartCard({
  title,
  description,
  legend,
  table,
  loading = false,
  empty = false,
  children,
}: ChartCardProps) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const showTable = view === "table" && table;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {table && !loading && !empty && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-11 lg:size-7"
              aria-pressed={view === "table"}
              aria-label={view === "table" ? "Afficher le graphique" : "Afficher le tableau"}
              title={view === "table" ? "Graphique" : "Tableau"}
              onClick={() => setView(view === "table" ? "chart" : "table")}
            >
              {view === "table" ? <ChartLine /> : <Table2 />}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton style={{ height: CHART_HEIGHT }} />
        ) : empty ? (
          <div
            className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
            style={{ height: CHART_HEIGHT }}
          >
            {empty}
          </div>
        ) : showTable ? (
          <div className="overflow-auto rounded-lg border" style={{ height: CHART_HEIGHT }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr>
                  {table.columns.map((column, index) => (
                    <th
                      key={column}
                      scope="col"
                      className={`border-b px-3 py-2 font-medium text-muted-foreground ${index === 0 ? "text-left" : "text-right"}`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={String(row[0])} className="border-b last:border-0">
                    {row.map((cell, index) => (
                      <td
                        key={index}
                        className={`px-3 py-1.5 tabular-nums ${index === 0 ? "text-left" : "text-right"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Sur mobile la légende passe sous le graphique (order-last) pour lui laisser toute la largeur.
          <div className="flex flex-col">
            {legend && legend.length > 1 && (
              <ul className="order-last mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:order-none sm:mt-0 sm:mb-3">
                {legend.map((series) => (
                  <li key={series.key} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-[3px]"
                      style={{ backgroundColor: series.color }}
                      aria-hidden
                    />
                    {series.label}
                  </li>
                ))}
              </ul>
            )}
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
