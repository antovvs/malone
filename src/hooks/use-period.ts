"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  previousPeriod,
  resolvePeriod,
  todayParis,
  trendRange,
  type PeriodPreset,
} from "@/lib/period";
import { prefsStore, type Prefs } from "@/lib/prefs-store";
import type { DateRange } from "@/types/myfeed";

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    prefsStore.subscribe,
    prefsStore.getSnapshot,
    prefsStore.getServerSnapshot,
  );
}

const noopSubscribe = () => () => {};

/**
 * Jour courant à Paris. Vaut null pendant le rendu serveur : la date dépend de
 * l'instant de la visite, elle n'est donc calculée que dans le navigateur.
 */
function useToday(): string | null {
  return useSyncExternalStore(noopSubscribe, todayParis, () => null);
}

export interface PeriodState {
  /** false tant que le navigateur n'a pas pris la main (rendu serveur). */
  ready: boolean;
  /** Jour courant à Paris (null pendant le rendu serveur). */
  today: string | null;
  preset: PeriodPreset;
  /** Période sélectionnée. */
  range: DateRange | null;
  /** Période de comparaison : même durée, juste avant. */
  previous: DateRange | null;
  /** Fenêtre des courbes de tendance (30 jours au minimum). */
  trend: DateRange | null;
  /** Modèle sélectionné, ou null pour la vue agrégée. */
  modelId: number | null;
  setPreset: (preset: PeriodPreset) => void;
  setCustomRange: (range: Partial<DateRange>) => void;
  setModelId: (modelId: number | null) => void;
}

/** Sélecteur de période global + modèle sélectionné, partagés par toutes les pages. */
export function usePeriod(): PeriodState {
  const prefs = usePrefs();
  const today = useToday();

  return useMemo(() => {
    const range = today
      ? resolvePeriod(prefs.preset, today, {
          from: prefs.customFrom ?? undefined,
          to: prefs.customTo ?? undefined,
        })
      : null;
    return {
      ready: range !== null,
      today,
      preset: prefs.preset,
      range,
      previous: range ? previousPeriod(range) : null,
      trend: range ? trendRange(range) : null,
      modelId: prefs.modelId,
      setPreset: (preset) => prefsStore.set({ preset }),
      setCustomRange: (custom) =>
        prefsStore.set({
          preset: "custom",
          ...(custom.from !== undefined ? { customFrom: custom.from } : {}),
          ...(custom.to !== undefined ? { customTo: custom.to } : {}),
        }),
      setModelId: (modelId) => prefsStore.set({ modelId }),
    };
  }, [prefs, today]);
}
