import { useState, useEffect } from "react"
import { Activity, AlertCircle, Zap, TrendingUp } from "lucide-react"
import { DashboardHeader } from "@/components/DashboardHeader"
import { StatsCard } from "@/components/StatsCard"
import { WebhookTester } from "@/components/WebhookTester"
import { getDashboardStats } from "@/lib/supabase"

const Index = () => {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>()
  const [stats, setStats] = useState({
    activeAutomations: 0,
    todayActivity: 0,
    errors: 0,
    totalRuns: 0,
    successRate: 0
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  // Load dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true)
      const dashboardStats = await getDashboardStats(selectedBusinessId)
      setStats(dashboardStats)
      setIsLoadingStats(false)
    }

    loadStats()
  }, [selectedBusinessId])

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Active Automations"
            value={isLoadingStats ? 0 : stats.activeAutomations}
            icon={Zap}
            description="Running workflows"
          />
          <StatsCard
            title="Today's Activity"
            value={isLoadingStats ? 0 : stats.todayActivity}
            icon={Activity}
            description="Executions today"
          />
          <StatsCard
            title="Errors"
            value={isLoadingStats ? 0 : stats.errors}
            icon={AlertCircle}
            description="Failed executions"
          />
          <StatsCard
            title="Success Rate"
            value={isLoadingStats ? 0 : stats.successRate}
            icon={TrendingUp}
            description="Overall performance (%)"
          />
        </div>

        {/* Test Interface - Show when Fight Flow Academy is selected */}
        {selectedBusinessId && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Automation Testing
            </h3>
            <div className="max-w-md">
              <WebhookTester />
            </div>
          </div>
        )}

        {/* Placeholder for future content */}
        <div className="bg-card rounded-lg border border-border p-8 text-center shadow-card">
          <div className="max-w-md mx-auto">
            <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Ready to automate?
            </h3>
            <p className="text-muted-foreground mb-4">
              {selectedBusinessId 
                ? "Your automation dashboard will appear here. Test the webhook above to verify the integration."
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
