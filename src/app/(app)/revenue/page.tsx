import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Revenus" };

export default function RevenuePage() {
  return (
    <ComingSoon
      title="Revenus"
      items={[
        "Tableau jour par jour, ventilé par type de revenu",
        "Comparaison avec la période précédente",
        "Liste des ventes avec tri, filtres et export CSV",
      ]}
    />
  );
}
