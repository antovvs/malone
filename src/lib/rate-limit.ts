/**
 * Protection anti brute-force du login, en mémoire.
 *
 * Deux garde-fous par adresse IP :
 *  - débit : 5 tentatives par minute au maximum ;
 *  - blocage : après 5 échecs d'affilée, l'IP est bloquée 15 minutes.
 * Une connexion réussie remet le compteur d'échecs à zéro.
 *
 * Limite connue : la mémoire est propre à chaque instance du serveur. Sur un
 * hébergement « serverless » (Vercel), plusieurs instances ne partagent pas ce
 * compteur ; pour une protection stricte, le brancher sur Redis / Upstash.
 */

export interface RateLimitOptions {
  /** Tentatives autorisées par fenêtre. */
  maxAttempts: number;
  /** Durée de la fenêtre de débit, en ms. */
  windowMs: number;
  /** Échecs consécutifs avant blocage. */
  maxFailures: number;
  /** Durée du blocage, en ms. */
  blockMs: number;
}

export const LOGIN_LIMITS: RateLimitOptions = {
  maxAttempts: 5,
  windowMs: 60_000,
  maxFailures: 5,
  blockMs: 15 * 60_000,
};

interface Entry {
  /** Horodatages des tentatives de la fenêtre en cours. */
  attempts: number[];
  failures: number;
  blockedUntil: number;
}

export type RateLimitVerdict =
  | { allowed: true }
  | { allowed: false; reason: "blocked" | "too_fast"; retryAfterMs: number };

/** Au-delà, on purge les entrées périmées pour ne pas laisser grossir la mémoire. */
const MAX_ENTRIES = 5_000;

export function createRateLimiter(options: RateLimitOptions = LOGIN_LIMITS) {
  const entries = new Map<string, Entry>();

  function prune(now: number) {
    if (entries.size < MAX_ENTRIES) return;
    for (const [key, entry] of entries) {
      const idle = entry.attempts.every((at) => now - at > options.windowMs);
      if (idle && entry.blockedUntil <= now) entries.delete(key);
    }
  }

  return {
    /**
     * À appeler AVANT de vérifier le mot de passe. Compte la tentative si elle
     * est autorisée ; sinon indique dans combien de temps réessayer.
     */
    check(key: string, now = Date.now()): RateLimitVerdict {
      prune(now);
      const entry = entries.get(key) ?? { attempts: [], failures: 0, blockedUntil: 0 };
      entries.set(key, entry);

      if (entry.blockedUntil > now) {
        return { allowed: false, reason: "blocked", retryAfterMs: entry.blockedUntil - now };
      }

      entry.attempts = entry.attempts.filter((at) => now - at < options.windowMs);
      if (entry.attempts.length >= options.maxAttempts) {
        const oldest = entry.attempts[0];
        return { allowed: false, reason: "too_fast", retryAfterMs: options.windowMs - (now - oldest) };
      }

      entry.attempts.push(now);
      return { allowed: true };
    },

    /** Mot de passe refusé : au bout de `maxFailures` échecs, l'IP est bloquée. */
    recordFailure(key: string, now = Date.now()) {
      const entry = entries.get(key);
      if (!entry) return;
      entry.failures += 1;
      if (entry.failures >= options.maxFailures) {
        entry.blockedUntil = now + options.blockMs;
        entry.failures = 0;
      }
    },

    /** Connexion réussie : on efface l'ardoise. */
    recordSuccess(key: string) {
      entries.delete(key);
    },
  };
}

/** Limiteur partagé par toutes les tentatives de connexion de cette instance. */
export const loginLimiter = createRateLimiter();
