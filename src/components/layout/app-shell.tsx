"use client";

import { Suspense, useCallback, useMemo, useState, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { FlaskConical, LogOut, Menu, PanelLeftClose, PanelLeftOpen, RefreshCw } from "lucide-react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { ModelSelector } from "@/components/layout/model-selector";
import { NavLinks, PageTitle } from "@/components/layout/nav-links";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ThemeToggle } from "@/components/layout/theme";
import { Avatar, LogoutDialog, useCurrentUser } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { refreshMyFeed, useDataMode } from "@/hooks/use-myfeed";
import { usePrefs } from "@/hooks/use-period";
import { swipeLeftHandlers, useEdgeSwipe } from "@/hooks/use-swipe";
import { prefsStore } from "@/lib/prefs-store";
import { cn } from "@/lib/utils";

/** Bouton d'icône : 44 px sur mobile (cible tactile), compact sur grand écran. */
const iconButton = "size-11 lg:size-8";

/** Structure commune aux pages connectées. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    // La session (nom, rôle) est lue côté client par useSession.
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { sidebarCollapsed } = usePrefs();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const user = useCurrentUser();

  const openMenu = useCallback(() => setMenuOpen(true), []);
  // Mobile : glisser depuis le bord gauche ouvre le menu, glisser à gauche le referme.
  useEdgeSwipe(openMenu, !menuOpen);
  const drawerSwipe = useMemo(() => swipeLeftHandlers(() => setMenuOpen(false)), []);

  return (
    <div className="flex min-h-dvh">
      {/* ---- Barre latérale (grand écran) : fixe, repliable ---- */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 ease-out lg:flex",
          sidebarCollapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div className={cn("flex h-14 items-center gap-2 px-4", sidebarCollapsed && "justify-center px-0")}>
          {!sidebarCollapsed && <Brand />}
          <Button
            variant="ghost"
            size="icon"
            className={cn(!sidebarCollapsed && "ml-auto")}
            aria-label={sidebarCollapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
            title={sidebarCollapsed ? "Déplier" : "Replier"}
            onClick={() => prefsStore.set({ sidebarCollapsed: !sidebarCollapsed })}
          >
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <Suspense>
            <NavLinks collapsed={sidebarCollapsed} />
          </Suspense>
        </div>
        <SidebarUser collapsed={sidebarCollapsed} onLogout={() => setLogoutOpen(true)} />
      </aside>

      {/* ---- Menu tiroir (mobile) ---- */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 gap-0 bg-sidebar" {...drawerSwipe}>
          <SheetHeader className="h-14 justify-center px-4 py-0">
            <SheetTitle render={<div />}>
              <Brand />
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <Suspense>
              <NavLinks onNavigate={() => setMenuOpen(false)} />
            </Suspense>
          </div>
          <SidebarUser
            collapsed={false}
            onLogout={() => {
              setMenuOpen(false);
              setLogoutOpen(true);
            }}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-lg">
          {/* Ligne 1 (mobile) : menu | titre de la page | thème | compte */}
          <div className="flex h-14 items-center gap-1 px-2 lg:hidden">
            <Button variant="ghost" size="icon" className={iconButton} aria-label="Ouvrir le menu" onClick={openMenu}>
              <Menu className="size-5" />
            </Button>
            <p className="min-w-0 flex-1 truncate px-1 text-base font-semibold tracking-tight">
              <Suspense>
                <PageTitle />
              </Suspense>
            </p>
            <DemoBadge />
            <ThemeToggle className={iconButton} />
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              aria-label={`Compte ${user.name} : se déconnecter`}
              className="flex size-11 items-center justify-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Avatar initials={user.initials} />
            </button>
          </div>

          {/* Filtres : modèle, période, rafraîchir. Défilent horizontalement si l'écran est étroit. */}
          <div className="flex items-center gap-2 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] lg:px-6 lg:py-2.5 [&::-webkit-scrollbar]:hidden">
            <ModelSelector />
            <div className="hidden flex-1 lg:block" />
            <div className="hidden lg:block">
              <DemoBadge />
            </div>
            <PeriodSelector />
            <Button
              variant="ghost"
              size="icon"
              className={cn(iconButton, "shrink-0")}
              aria-label="Rafraîchir les données"
              title="Rafraîchir les données"
              onClick={refreshMyFeed}
            >
              <RefreshCw />
            </Button>
            <ThemeToggle className="hidden lg:inline-flex" />
          </div>
        </header>

        {/* Marge basse sur mobile : le contenu ne passe pas sous la barre de navigation. */}
        <main className="flex-1 px-3 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-4 lg:px-6 lg:py-6">
          {children}
        </main>
      </div>

      <Suspense>
        <BottomNav onLogout={() => setLogoutOpen(true)} />
      </Suspense>
      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
          <path d="M4.5 18V7.5l7.5 8 7.5-8V18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-sm font-semibold tracking-tight">Malone</span>
    </div>
  );
}

/** Pied de barre latérale : qui est connecté, et le bouton de déconnexion. */
function SidebarUser({ collapsed, onLogout }: { collapsed: boolean; onLogout: () => void }) {
  const user = useCurrentUser();

  return (
    <div className={cn("border-t p-2", collapsed && "flex flex-col items-center gap-1")}>
      <div className={cn("flex items-center gap-2.5 px-2 py-2", collapsed && "px-0")} title={collapsed ? user.name : undefined}>
        <Avatar initials={user.initials} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name || "…"}</p>
            <p className="truncate text-xs text-muted-foreground">{user.role}</p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onLogout}
        aria-label="Se déconnecter"
        title={collapsed ? "Se déconnecter" : undefined}
        className={cn(
          "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 lg:min-h-9",
          collapsed && "w-9 justify-center px-0",
        )}
      >
        <LogOut className="size-4 shrink-0" aria-hidden />
        {!collapsed && "Se déconnecter"}
      </button>
    </div>
  );
}

/** Signale clairement que les chiffres affichés sont fictifs. */
function DemoBadge() {
  const mode = useDataMode();
  if (mode !== "demo") return null;
  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-full border border-(--status-warning)/50 bg-(--status-warning)/10 px-2 py-1 text-xs font-medium whitespace-nowrap"
      title="MYFEED_API_KEY n'est pas renseignée : les chiffres affichés sont fictifs."
    >
      <FlaskConical className="size-3.5" aria-hidden />
      {/* Libellé court sur mobile pour laisser la place au titre de la page. */}
      <span className="lg:hidden">Démo</span>
      <span className="hidden lg:inline">Données de démo</span>
    </span>
  );
}
