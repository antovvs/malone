import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Scripts de vente" };

export default function ScriptsPage() {
  return (
    <ComingSoon
      title="Scripts de vente"
      items={[
        "Liste des scripts et de leurs étapes",
        "Classement par taux de conversion et CA généré",
      ]}
    />
  );
}
