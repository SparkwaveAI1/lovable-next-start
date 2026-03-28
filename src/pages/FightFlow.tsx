import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { FightFlowDashboard } from "@/components/dashboard/FightFlowDashboard";

// Fight Flow Academy business ID (hardcoded — single-tenant page)
const FIGHT_FLOW_BUSINESS_ID = "456dc53b-d9d9-41b0-bc33-4f4c4a791eff";

export default function FightFlow() {
  const navigate = useNavigate();

  const handleContactClick = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  return (
    <DashboardLayout>
      <PageContent>
        <FightFlowDashboard
          businessId={FIGHT_FLOW_BUSINESS_ID}
          onContactClick={handleContactClick}
        />
      </PageContent>
    </DashboardLayout>
  );
}
