"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Hook d'accès aux données MyFeed, via notre proxy /api/myfeed/<outil>.
 *
 *   const { data, loading, error } = useMyFeed<MyFeedList<Sale>>(
 *     "get_sales", { from, to, model_id }, { all: true });
 *
 * - `tool` à null met l'appel en attente (paramètres pas encore connus) ;
 * - `all: true` demande au proxy de suivre toute la pagination ;
 * - deux composants qui demandent la même chose partagent un seul appel.
 */

export type MyFeedParams = Record<string, string | number | null | undefined>;

export interface MyFeedState<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
}

/** D'où viennent les données affichées (renvoyé par le proxy dans X-Data-Mode). */
export type DataMode = "live" | "demo" | "unconfigured";

/** Durée pendant laquelle une réponse est réutilisée sans rappeler MyFeed. */
const CACHE_TTL_MS = 60_000;

const cache = new Map<string, { at: number; promise: Promise<unknown> }>();

/* ---- Petit état partagé : mode des données + compteur de rafraîchissement ---- */

let dataMode: DataMode | null = null;
let refreshCount = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const notify = () => listeners.forEach((listener) => listener());

/** « live », « demo » ou « unconfigured » ; null tant qu'aucune réponse n'est arrivée. */
export function useDataMode(): DataMode | null {
  return useSyncExternalStore(subscribe, () => dataMode, () => null);
}

/** Vide le cache et relance tous les appels en cours d'affichage. */
export function refreshMyFeed() {
  cache.clear();
  refreshCount += 1;
  notify();
}

function buildUrl(tool: string, params: MyFeedParams, all: boolean): string {
  const search = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  if (all) search.set("all", "1");
  const query = search.toString();
  return `/api/myfeed/${tool}${query ? `?${query}` : ""}`;
}

async function request(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (response.status === 401) {
    // Session expirée : retour à la page de connexion.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- rechargement complet voulu : vide le cache mémoire
    window.location.assign("/login");
    throw new Error("Session expirée.");
  }

  const mode = response.headers.get("X-Data-Mode") as DataMode | null;
  if (mode && mode !== dataMode) {
    dataMode = mode;
    notify();
  }

  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(body?.error ?? `Erreur ${response.status}`);
  }
  return body;
}

function fetchCached(url: string): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise;
  const promise = request(url);
  cache.set(url, { at: Date.now(), promise });
  // Une erreur ne doit pas rester en cache : le prochain rendu réessaiera.
  promise.catch(() => {
    if (cache.get(url)?.promise === promise) cache.delete(url);
  });
  return promise;
}

export function useMyFeed<T>(
  tool: string | null,
  params: MyFeedParams = {},
  options: { all?: boolean } = {},
): MyFeedState<T> {
  const url = tool ? buildUrl(tool, params, options.all ?? false) : null;
  // Change à chaque « rafraîchir » : force un nouvel appel pour la même URL.
  const version = useSyncExternalStore(subscribe, () => refreshCount, () => 0);
  const key = url ? `${version}:${url}` : null;
  const [state, setState] = useState<{ key: string; data?: T; error?: string } | null>(null);

  useEffect(() => {
    if (!url || !key) return;
    let cancelled = false;
    fetchCached(url).then(
      (data) => {
        if (!cancelled) setState({ key, data: data as T });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ key, error: error instanceof Error ? error.message : "Erreur inconnue" });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url, key]);

  // L'état ne vaut que pour la demande courante : en changeant de période, on
  // repasse en chargement au lieu d'afficher les chiffres de l'ancienne.
  const current = state && state.key === key ? state : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: key !== null && current === null,
  };
}
