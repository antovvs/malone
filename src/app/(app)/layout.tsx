import { AppShell } from "@/components/layout/app-shell";

/** Layout des pages connectées (barre latérale + en-tête). /login n'en fait pas partie. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
