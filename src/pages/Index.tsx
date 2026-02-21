import { useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { PageHeader, PageContent } from "@/components/layout/PageLayout"
import { ContactDetail } from "@/components/ContactDetail"
import { useBusinessContext } from "@/contexts/BusinessContext"
import { useBusinesses } from "@/hooks/useBusinesses"

// Dashboard components
import { TodaysConversations } from "@/components/dashboard/TodaysConversations"
import { TodaysClasses } from "@/components/dashboard/TodaysClasses"
import { RecentBookings } from "@/components/dashboard/RecentBookings"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { FightFlowDashboard } from "@/components/dashboard/FightFlowDashboard"

const Index = () => {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // If a contact is selected, show the contact detail view
  if (selectedContactId) {
    return (
      <DashboardLayout
        selectedBusinessId={selectedBusiness?.id}
        onBusinessChange={(id) => {
          const business = businesses.find(b => b.id === id);
          if (business) setSelectedBusiness(business);
        }}
        businessName={selectedBusiness?.name}
      >
        <PageContent>
          <ContactDetail
            contactId={selectedContactId}
            onBack={() => setSelectedContactId(null)}
          />
        </PageContent>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find(b => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <PageContent>
        {/* Welcome Section */}
        <PageHeader
          title={selectedBusiness ? `${selectedBusiness.name} Dashboard` : "Automation Center"}
          description={selectedBusiness
            ? "Monitor conversations, bookings, and class enrollments"
            : "Select a business above to get started"
          }
        />

        {selectedBusiness ? (
          <>
            {/* Quick Actions Row */}
            <div className="mb-8">
              <QuickActions />
            </div>

            {/* Fight Flow At-a-Glance — TOP of dashboard when Fight Flow selected */}
            {(selectedBusiness.name.toLowerCase().includes('fight') || selectedBusiness.slug?.toLowerCase().includes('fight')) && (
              <div className="mb-8">
                <FightFlowDashboard
                  businessId={selectedBusiness.id}
                  onContactClick={(contactId) => setSelectedContactId(contactId)}
                />
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Today's Conversations - Takes 2 columns */}
              <div className="lg:col-span-2">
                <TodaysConversations
                  businessId={selectedBusiness.id}
                  onContactClick={(contactId) => setSelectedContactId(contactId)}
                />
              </div>

              {/* Today's Classes - Takes 1 column */}
              <div className="lg:col-span-1">
                <TodaysClasses businessId={selectedBusiness.id} />
              </div>
            </div>

            {/* Recent Bookings - Full Width */}
            <div className="mb-8">
              <RecentBookings
                businessId={selectedBusiness.id}
                onContactClick={(contactId) => setSelectedContactId(contactId)}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="p-4 bg-indigo-50 rounded-xl w-fit mx-auto mb-4">
              <svg className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Select a Business
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Choose a business from the dropdown above to view your dashboard with conversations, bookings, and class schedules.
            </p>
          </div>
        )}
      </PageContent>
    </DashboardLayout>
  );
};

export default Index;
