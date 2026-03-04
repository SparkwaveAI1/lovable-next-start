import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { FightFlowDashboard } from "@/components/dashboard/FightFlowDashboard";

export default function FightFlow() {
  return (
    <DashboardLayout>
      <PageContent>
        <FightFlowDashboard />
      </PageContent>
    </DashboardLayout>
  );
}
