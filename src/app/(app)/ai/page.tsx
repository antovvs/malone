import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "IA de chatting" };

export default function AiPage() {
  return (
    <ComingSoon
      title="IA de chatting"
      items={[
        "État de l'IA et de ses limites",
        "Performance des scripts IA",
        "Comparaison IA / humain",
      ]}
    />
  );
}
