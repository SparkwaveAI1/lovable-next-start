import { useState } from "react"
import { Activity, AlertCircle, Zap } from "lucide-react"
import { DashboardHeader } from "@/components/DashboardHeader"
import { StatsCard } from "@/components/StatsCard"
import { mockStats } from "@/lib/supabase"

const Index = () => {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        selectedBusinessId={selectedBusinessId}
        onBusinessChange={setSelectedBusinessId}
      />
      
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome to Automation Center
          </h2>
          <p className="text-muted-foreground">
            Manage your business automations across all your companies
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Active Automations"
            value={mockStats.activeAutomations}
            icon={Zap}
            description="Currently running"
          />
          <StatsCard
            title="Today's Activity"
            value={mockStats.todayActivity}
            icon={Activity}
            description="Processed today"
          />
          <StatsCard
            title="Errors"
            value={mockStats.errors}
            icon={AlertCircle}
            description="Requires attention"
          />
        </div>

        {/* Placeholder for future content */}
        <div className="bg-card rounded-lg border border-border p-8 text-center shadow-card">
          <div className="max-w-md mx-auto">
            <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Ready to automate?
            </h3>
            <p className="text-muted-foreground mb-4">
              {selectedBusinessId 
                ? "Your automation dashboard will appear here once we connect to Supabase."
                : "Select a business above to start managing your automations."
              }
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
