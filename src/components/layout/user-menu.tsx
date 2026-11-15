"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { prefsStore } from "@/lib/prefs-store";
import { cn } from "@/lib/utils";

const ROLE_LABELS = { admin: "Administrateur", manager: "Manager" } as const;

/** Utilisateur connecté, avec des valeurs neutres tant que la session charge. */
export function useCurrentUser() {
  const { data: session } = useSession();
  const name = session?.user?.name || session?.user?.username || "";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return {
    name,
    initials: initials || "·",
    role: session?.user?.role ? ROLE_LABELS[session.user.role] : "",
  };
}

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/**
 * Confirmation de déconnexion. Une vraie boîte de dialogue : se déconnecter
 * par un appui accidentel (surtout au pouce, sur mobile) fait perdre le fil.
 */
export function LogoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      // NextAuth efface le cookie de session (requête protégée par son jeton CSRF).
      await signOut({ redirect: false });
    } finally {
      // Le modèle sélectionné appartient au compte qu'on quitte.
      prefsStore.set({ modelId: null });
      // Rechargement complet voulu : il vide les données gardées en mémoire.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- voir ci-dessus
      window.location.assign("/login");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
          <AlertDialogDescription>
            Vous devrez saisir à nouveau votre identifiant et votre mot de passe pour revenir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 sm:h-8" disabled={pending}>
            Rester connecté
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="h-11 sm:h-8"
            disabled={pending}
            onClick={logout}
          >
            <LogOut aria-hidden />
            {pending ? "Déconnexion…" : "Se déconnecter"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
