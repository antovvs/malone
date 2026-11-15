"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  Euro,
  LayoutDashboard,
  Link2,
  MessagesSquare,
  ScrollText,
  Send,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  /** Libellé complet (barre latérale, titre de page). */
  label: string;
  /** Libellé court de la barre du bas sur mobile. */
  short: string;
  icon: LucideIcon;
  /** Page pas encore construite : affichée avec une pastille « Bientôt ». */
  soon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/revenue", label: "Revenus", short: "Revenus", icon: Euro, soon: true },
  { href: "/subscribers", label: "Abonnés", short: "Abonnés", icon: Users, soon: true },
  { href: "/chatters", label: "Chatteurs", short: "Équipe", icon: MessagesSquare, soon: true },
  { href: "/ppv", label: "PPV & Push", short: "PPV", icon: Send, soon: true },
  { href: "/ai", label: "IA de chatting", short: "IA", icon: Bot, soon: true },
  { href: "/scripts", label: "Scripts de vente", short: "Scripts", icon: ScrollText, soon: true },
  { href: "/traffic", label: "Trafic & Link in bio", short: "Trafic", icon: Link2, soon: true },
  { href: "/planning", label: "Planning & SFS", short: "Planning", icon: CalendarDays, soon: true },
  { href: "/finances", label: "Finances", short: "Finances", icon: Wallet, soon: true },
];

/** Les 4 premières pages vivent dans la barre du bas sur mobile ; le reste est sous « Plus ». */
export const PRIMARY_NAV = NAV_ITEMS.slice(0, 4);
export const MORE_NAV = NAV_ITEMS.slice(4);

export function isActive(item: NavItem, pathname: string): boolean {
  return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
}

/** Titre de la page courante (en-tête mobile). */
export function PageTitle() {
  const pathname = usePathname();
  return <>{NAV_ITEMS.find((item) => isActive(item, pathname))?.label ?? "Malone"}</>;
}

interface NavLinksProps {
  items?: NavItem[];
  /** Barre latérale repliée : icônes seules, le libellé passe en infobulle. */
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function NavLinks({ items = NAV_ITEMS, collapsed = false, onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            aria-label={collapsed ? item.label : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              // 44 px de haut au minimum : cible tactile confortable.
              "flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:min-h-9",
              collapsed && "justify-center px-0",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.soon && (
                  <span className="rounded-full border px-1.5 py-px text-[10px] leading-4 text-muted-foreground">
                    Bientôt
                  </span>
                )}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
