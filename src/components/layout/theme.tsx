"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePrefs } from "@/hooks/use-period";
import { PREFS_STORAGE_KEY, prefsStore } from "@/lib/prefs-store";
import { cn } from "@/lib/utils";

/**
 * Thème sombre par défaut, clair en option.
 * Le choix vit dans les préférences (localStorage). Un petit script en ligne
 * l'applique avant le premier affichage pour éviter un flash sombre → clair.
 */

const THEME_SCRIPT = `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  PREFS_STORAGE_KEY,
)})||"{}");if(p.theme==="light")document.documentElement.classList.remove("dark")}catch(e){}`;

export function ThemeScript() {
  return (
    <script
      // Exécuté par le navigateur au chargement ; inerte lors des rendus React côté client.
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}

/** Garde la classe `dark` de <html> alignée sur la préférence. */
export function ThemeSync() {
  const { theme } = usePrefs();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme } = usePrefs();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("shrink-0", className)}
      aria-label={next === "light" ? "Passer au thème clair" : "Passer au thème sombre"}
      title={next === "light" ? "Thème clair" : "Thème sombre"}
      onClick={() => prefsStore.set({ theme: next })}
    >
      {/* Les deux icônes sont rendues ; le CSS montre la bonne, sans dépendre de l'hydratation. */}
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
