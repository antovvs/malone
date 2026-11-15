import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Performance chatteurs" };

export default function ChattersPage() {
  return (
    <ComingSoon
      title="Performance chatteurs"
      items={[
        "Classement des chatteurs : ventes, CA, panier moyen, conversion",
        "Fiche détaillée par chatteur",
        "Recommandations personnalisées",
      ]}
    />
  );
}
