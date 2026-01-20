import { useState, useEffect } from "react"
import { Activity, AlertCircle, Zap, TrendingUp, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import { DashboardHeader } from "@/components/DashboardHeader"
import { StatsCard } from "@/components/StatsCard"
import { PageLayout, PageHeader, PageContent } from "@/components/layout/PageLayout"

import { getDashboardStats } from "@/lib/supabase"
import { ActivityLog } from "@/components/ActivityLog"
import { supabase } from "@/integrations/supabase/client"
import { sendSMS } from '@/lib/smsService'
import { ContactsTable } from '@/components/ContactsTable'
import { useBusinessContext } from "@/contexts/BusinessContext"
import { useBusinesses } from "@/hooks/useBusinesses"
import { TokenHealthDashboard } from "@/components/TokenHealthDashboard"
import { Card } from "@/components/ui/card"
// import { GoHighLevelConfig } from "@/components/GoHighLevelConfig"

const Index = () => {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
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
      const dashboardStats = await getDashboardStats(selectedBusiness?.id)
      setStats(dashboardStats)
      setIsLoadingStats(false)
    }

    loadStats()
  }, [selectedBusiness])

  return (
    <PageLayout>
      <DashboardHeader
        selectedBusinessId={selectedBusiness?.id}
        onBusinessChange={(id) => {
          const business = businesses.find(b => b.id === id);
          if (business) setSelectedBusiness(business);
        }}
      />

      <PageContent className="pt-2 md:pt-28">
        {/* Welcome Section */}
        <PageHeader
          title="Welcome to Automation Center"
          description="Manage your business automations across all your companies"
          actions={
            <Link
              to="/content-center"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Content Creation Center
            </Link>
          }
        />

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <StatsCard
            title="Active Automations"
            value={isLoadingStats ? 0 : stats.activeAutomations}
            icon={Zap}
            subtitle="Running workflows"
          />
          <StatsCard
            title="Today's Activity"
            value={isLoadingStats ? 0 : stats.todayActivity}
            icon={Activity}
            subtitle="Executions today"
          />
          <StatsCard
            title="Errors"
            value={isLoadingStats ? 0 : stats.errors}
            icon={AlertCircle}
            subtitle="Failed executions"
            variant={stats.errors > 0 ? "error" : "default"}
          />
          <StatsCard
            title="Success Rate"
            value={isLoadingStats ? 0 : `${stats.successRate}%`}
            icon={TrendingUp}
            subtitle="Overall performance"
            variant={stats.successRate >= 90 ? "success" : stats.successRate >= 70 ? "warning" : "error"}
          />
        </div>

        {/* Token Health Monitoring */}
        <div className="mb-12">
          <TokenHealthDashboard />
        </div>

        {/* Contacts Management - Show when business is selected */}
        {selectedBusiness && (
          <div className="mb-8">
            <ContactsTable businessId={selectedBusiness.id} />
          </div>
        )}

        {/* Configuration - Show when business is selected */}
        {/* Temporarily hidden - GoHighLevel Configuration
        {selectedBusinessId && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              GoHighLevel Configuration
            </h3>
            <GoHighLevelConfig businessId={selectedBusinessId} />
          </div>
        )}
        */}

        {/* Activity Log */}
        <div className="mb-8">
          <ActivityLog businessId={selectedBusiness?.id} />
        </div>

        {/* Placeholder for future content */}
        <Card variant="elevated" className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-3 bg-indigo-50 rounded-xl w-fit mx-auto mb-4">
              <Zap className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to automate?
            </h3>
            <p className="text-gray-500">
              {selectedBusiness
                ? "Your automation monitoring dashboard is ready. Your CRM system is active and processing form submissions."
                : "Select a business above to start managing your automations."
              }
            </p>
          </div>
        </Card>
      </PageContent>
    </PageLayout>
  );
};

export default Index;
