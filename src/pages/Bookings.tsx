import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, CalendarCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Bookings() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find((b) => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <PageContent>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-green-600" />
            Bookings
          </h1>
          <p className="text-slate-500 mt-1">
            Manage appointments and class schedules
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardContent className="flex flex-col items-center text-center py-16 px-8">
            <div className="p-4 bg-green-50 rounded-2xl mb-6">
              <CalendarCheck className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Calendar Integration Coming Soon
            </h2>
            <p className="text-slate-500 mb-6 max-w-md">
              We're building a seamless booking experience that syncs with your
              existing calendar. Connect Google Calendar, Calendly, or your
              scheduling tool to manage all appointments in one place.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" disabled className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Connect Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageContent>
    </DashboardLayout>
  );
}
