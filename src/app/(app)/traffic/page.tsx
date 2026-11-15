import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Trafic & Link in bio" };

export default function TrafficPage() {
  return (
    <ComingSoon
      title="Trafic & Link in bio"
      items={[
        "Vues, clics et taux de clic des pages de liens",
        "Performance de chaque bouton",
        "Liens de tracking par source et par jour",
      ]}
    />
  );
}
