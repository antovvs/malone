import type { PeriodPreset } from "@/lib/period";

/**
 * Préférences d'affichage (thème, période, modèle sélectionné), gardées dans le
 * localStorage du navigateur. Petit « store externe » lu avec
 * useSyncExternalStore : tous les composants voient la même valeur et se
 * mettent à jour ensemble, sans Context ni état dupliqué.
 *
 * Rien de sensible ici : la session vit dans un cookie httpOnly, la clé API sur le serveur.
 */

export interface Prefs {
  theme: "dark" | "light";
  preset: PeriodPreset;
  customFrom: string | null;
  customTo: string | null;
  /** null = vue agrégée de tous les modèles. */
  modelId: number | null;
  /** Barre latérale réduite aux icônes (grand écran). */
  sidebarCollapsed: boolean;
}

export const PREFS_STORAGE_KEY = "myfeed.prefs";

export const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  preset: "30d",
  customFrom: null,
  customTo: null,
  modelId: null,
  sidebarCollapsed: false,
};

let cache: Prefs | null = null;
const listeners = new Set<() => void>();

function read(): Prefs {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    cache = raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    // Stockage indisponible (navigation privée…) : on garde les valeurs par défaut.
    cache = DEFAULT_PREFS;
  }
  return cache;
}

export const prefsStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: read,
  /** Rendu serveur : toujours les valeurs par défaut (pas de localStorage). */
  getServerSnapshot: () => DEFAULT_PREFS,
  set(patch: Partial<Prefs>) {
    cache = { ...read(), ...patch };
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // Écriture impossible : la préférence vaut au moins pour cette session.
    }
    listeners.forEach((listener) => listener());
  },
};
