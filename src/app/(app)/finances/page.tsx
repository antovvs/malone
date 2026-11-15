import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Finances" };

export default function FinancesPage() {
  return (
    <ComingSoon
      title="Finances"
      items={[
        "Solde validé et en attente",
        "Historique des virements et remboursements",
        "Projection de revenus",
      ]}
    />
  );
}
