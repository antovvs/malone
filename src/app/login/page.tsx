import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

import "./login.css";

export const metadata: Metadata = { title: "Connexion" };

/** Page de connexion : toujours sombre, quel que soit le thème choisi dans le dashboard. */
export default function LoginPage() {
  return (
    <div className="login-root relative flex min-h-dvh flex-col overflow-x-hidden">
      {/* Décor : purement visuel, ignoré par les lecteurs d'écran. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="login-aurora login-aurora--blue" />
        <div className="login-aurora login-aurora--violet" />
        <div className="login-aurora login-aurora--cyan" />
        <div className="login-grid" />
        <div className="login-vignette" />
      </div>

      {/* min-h-dvh + défilement libre : sur mobile, le clavier ne masque jamais le formulaire. */}
      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <LoginForm />
      </main>

      <footer className="relative pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-xs text-neutral-500">
        © 2026 Malone
      </footer>
    </div>
  );
}
