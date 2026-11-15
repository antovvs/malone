import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Analyse PPV & Push" };

export default function PpvPage() {
  return (
    <ComingSoon
      title="Analyse PPV & Push"
      items={[
        "Conversion par type de PPV et par prix",
        "Historique des push : envoyés, vus, achetés",
        "Meilleurs horaires d'envoi",
      ]}
    />
  );
}
