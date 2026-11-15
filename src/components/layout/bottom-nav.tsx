"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, LogOut } from "lucide-react";

import { isActive, MORE_NAV, NavLinks, PRIMARY_NAV } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/layout/theme";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const itemClass =
  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none transition-colors focus-visible:bg-muted";

/**
 * Barre de navigation du bas (mobile) : les 4 pages principales sous le pouce,
 * et « Plus » pour le reste. Elle respecte la zone de l'indicateur d'accueil
 * des iPhone (safe-area).
 */
export function BottomNav({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_NAV.some((item) => isActive(item, pathname));

  return (
    <>
      <nav
        aria-label="Navigation mobile"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      >
        {PRIMARY_NAV.map((item) => {
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(itemClass, active ? "text-foreground" : "text-muted-foreground")}
            >
              <item.icon className={cn("size-5", active && "stroke-[2.25]")} aria-hidden />
              {item.short}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={cn(itemClass, moreActive ? "text-foreground" : "text-muted-foreground")}
        >
          <Ellipsis className="size-5" aria-hidden />
          Plus
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="gap-0 rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="flex-row items-center justify-between px-4 pt-4 pb-2">
            <SheetTitle>Plus de pages</SheetTitle>
            <ThemeToggle />
          </SheetHeader>
          <div className="px-2">
            <NavLinks items={MORE_NAV} onNavigate={() => setMoreOpen(false)} />
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onLogout();
              }}
              className="mt-1 flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <LogOut className="size-4" aria-hidden />
              Se déconnecter
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
