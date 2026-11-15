import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Abonnés" };

export default function SubscribersPage() {
  return (
    <ComingSoon
      title="Abonnés"
      items={[
        "Évolution des abonnés actifs",
        "Rétention, churn et ratio payants / gratuits",
        "Funnel et cohortes de désabonnement",
      ]}
    />
  );
}
