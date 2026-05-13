import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { SpeedToLeadDashboard } from "@/components/dashboard/FightFlowDashboard";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { Card, CardContent } from "@/components/ui/card";

export default function SpeedToLead() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusinessContext();

  const handleContactClick = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  return (
    <DashboardLayout>
      <PageContent>
        {selectedBusiness ? (
          <SpeedToLeadDashboard
            businessId={selectedBusiness.id}
            onContactClick={handleContactClick}
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-gray-600">
              Select a business to view the generic Speed-to-Lead operating module.
            </CardContent>
          </Card>
        )}
      </PageContent>
    </DashboardLayout>
  );
}
