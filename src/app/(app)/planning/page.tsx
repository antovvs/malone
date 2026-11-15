import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Planning & SFS" };

export default function PlanningPage() {
  return (
    <ComingSoon
      title="Planning & SFS"
      items={[
        "Calendrier des SFS planifiés",
        "Deals SFS en cours et à venir",
        "Planning et présence de l'équipe",
      ]}
    />
  );
}
