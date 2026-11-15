"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { ArrowUpRight, Eye, EyeOff, LoaderCircle, TriangleAlert } from "lucide-react";

import { KonamiConfetti } from "@/components/auth/konami-confetti";
import { cn } from "@/lib/utils";

/** Contact pour obtenir un accès. */
const TELEGRAM_HANDLE = "sqrobot";

/** Durée d'affichage du message d'erreur avant qu'il ne s'efface seul. */
const ERROR_TIMEOUT_MS = 5000;
/** Durée de l'animation de sortie de la carte avant la redirection. */
const LEAVE_MS = 360;

const MESSAGES = {
  credentials: "Identifiant ou mot de passe incorrect",
  rate_limited: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
  network: "Connexion au serveur impossible. Vérifiez votre réseau.",
  empty: "Renseignez votre identifiant et votre mot de passe.",
} as const;

/** Délai d'apparition en cascade (100 ms entre chaque bloc). */
const rise = (step: number): CSSProperties => ({ animationDelay: `${120 + step * 100}ms` });

const inputClass =
  "h-12 w-full rounded-lg border border-white/10 bg-white/5 px-3.5 text-base text-white outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-neutral-500 hover:border-white/20 focus:border-blue-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20 sm:h-11 sm:text-sm";

/**
 * Page de retour après connexion : uniquement un chemin interne, pour qu'un
 * lien piégé (?callbackUrl=https://…) ne puisse pas rediriger ailleurs.
 */
function safeCallbackUrl(): string {
  const target = new URLSearchParams(window.location.search).get("callbackUrl");
  return target && target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "leaving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const passwordRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [staticCard, setStaticCard] = useState(false);

  useEffect(() => () => clearTimeout(errorTimer.current), []);

  // Filet de sécurité : si le navigateur n'a pas joué l'animation d'entrée (onglet
  // en arrière-plan, webview qui ne rafraîchit pas), on affiche la carte sans
  // animation. Un formulaire de connexion ne doit jamais rester invisible.
  useEffect(() => {
    const timer = setTimeout(() => {
      const card = cardRef.current;
      if (card && Number(getComputedStyle(card).opacity) < 0.5) setStaticCard(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  function fail(message: string) {
    setStatus("idle");
    setError(message);
    setShaking(true);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), ERROR_TIMEOUT_MS);
    // Prêt à retaper : le mot de passe refusé est sélectionné, la frappe suivante le remplace.
    passwordRef.current?.focus();
    passwordRef.current?.select();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "idle") return;
    if (!username.trim() || !password) {
      fail(MESSAGES.empty);
      return;
    }
    clearTimeout(errorTimer.current);
    setError(null);
    setStatus("pending");

    try {
      // NextAuth joint lui-même le jeton CSRF à la requête.
      const result = await signIn("credentials", { username, password, redirect: false });
      if (result?.error) {
        fail(result.code === "rate_limited" ? MESSAGES.rate_limited : MESSAGES.credentials);
        return;
      }
      // Succès : la carte s'efface, puis navigation complète pour que la garde d'accès lise le cookie.
      setStatus("leaving");
      const destination = safeCallbackUrl();
      setTimeout(() => window.location.assign(destination), LEAVE_MS);
    } catch {
      fail(MESSAGES.network);
    }
  }

  const busy = status !== "idle";

  return (
    <>
      <KonamiConfetti />

      {/* Deux niveaux : le conteneur tremble en cas d'erreur, la carte gère l'entrée et la sortie. */}
      <div
        className={cn("w-full max-w-sm", shaking && "login-shake", staticCard && "login-static")}
        onAnimationEnd={(event) => {
          if (event.animationName === "login-shake") setShaking(false);
        }}
      >
        <div
          ref={cardRef}
          className={cn(
            "login-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8",
            status === "leaving" && "login-leave",
          )}
        >
          <header className="login-rise flex flex-col items-center text-center" style={rise(0)}>
            <MaloneMark />
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Malone</h1>
            <p className="mt-1 text-sm text-neutral-400">Dashboard Analytics</p>
          </header>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-4" noValidate>
            {error && (
              <div
                role="alert"
                className="login-error flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-400"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className="login-rise" style={rise(1)}>
              <label htmlFor="username" className="mb-1.5 block text-sm text-neutral-400">
                Identifiant
              </label>
              <input
                id="username"
                name="username"
                type="text"
                inputMode="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                required
                aria-label="Identifiant"
                aria-invalid={error ? true : undefined}
                placeholder="votre identifiant"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                readOnly={busy}
                className={inputClass}
              />
            </div>

            <div className="login-rise" style={rise(2)}>
              <label htmlFor="password" className="mb-1.5 block text-sm text-neutral-400">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  required
                  aria-label="Mot de passe"
                  aria-invalid={error ? true : undefined}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  ref={passwordRef}
                  readOnly={busy}
                  className={cn(inputClass, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-neutral-400 outline-none transition-colors hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
            </div>

            <div className="login-rise pt-2" style={rise(3)}>
              <button
                type="submit"
                disabled={busy}
                aria-label="Se connecter"
                className="login-submit flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-medium text-black outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] disabled:cursor-progress disabled:bg-white/85 sm:h-11"
              >
                {status === "pending" && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                {status === "pending" ? "Connexion…" : status === "leaving" ? "Bienvenue" : "Se connecter"}
              </button>
            </div>
          </form>

          <div className="login-rise" style={rise(4)}>
            <div className="my-6 h-px bg-white/10" role="separator" />
            <p className="text-center text-sm text-neutral-400">
              Pas d&apos;identifiant ?
              <a
                href={`https://t.me/${TELEGRAM_HANDLE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-1 flex min-h-11 items-center justify-center gap-1.5 rounded-md text-blue-400 outline-none transition-colors hover:text-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                <TelegramIcon className="size-4" />
                <span>Contactez @{TELEGRAM_HANDLE} sur Telegram</span>
                <ArrowUpRight
                  className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/** Logo : un « M » tracé comme une courbe de graphique, terminé par un point lumineux. */
function MaloneMark() {
  return (
    <span className="flex size-12 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-b from-white/15 to-white/5 shadow-lg shadow-blue-500/10">
      <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
        <path
          d="M4.5 18V7.5l7.5 8 7.5-8V18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="login-logo-dot" cx="19.5" cy="7.5" r="1.9" fill="#60a5fa" />
      </svg>
    </span>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M21.94 4.3c.25-1.1-.4-1.56-1.3-1.22L2.9 9.93c-1.2.47-1.18 1.15-.2 1.45l4.55 1.42 10.5-6.63c.5-.3.95-.14.58.2l-8.5 7.68-.33 4.7c.47 0 .68-.2.93-.46l2.24-2.16 4.63 3.42c.86.47 1.47.23 1.68-.8L21.94 4.3Z" />
    </svg>
  );
}
