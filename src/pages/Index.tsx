import { useState, useEffect } from "react"
import { Activity, AlertCircle, Zap, TrendingUp, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import { DashboardHeader } from "@/components/DashboardHeader"
import { StatsCard } from "@/components/StatsCard"

import { getDashboardStats } from "@/lib/supabase"
import { ActivityLog } from "@/components/ActivityLog"
import { supabase } from "@/integrations/supabase/client"
import { sendSMS } from '@/lib/smsService'
import { ContactsTable } from '@/components/ContactsTable'
import { useBusinessContext } from "@/contexts/BusinessContext"
import { useBusinesses } from "@/hooks/useBusinesses"
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
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <DashboardHeader 
        selectedBusinessId={selectedBusiness?.id}
        onBusinessChange={(id) => {
          const business = businesses.find(b => b.id === id);
          if (business) setSelectedBusiness(business);
        }}
      />
      
      <main className="container mx-auto px-4 sm:px-6 py-4 md:py-8 pt-2 md:pt-28">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome to Automation Center
          </h2>
          <p className="text-muted-foreground">
            Manage your business automations across all your companies
          </p>
          <div className="mt-4">
            <Link 
              to="/content-center" 
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Content Creation Center
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-12">
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
        <div className="bg-card rounded-lg border border-border p-8 text-center shadow-card">
          <div className="max-w-md mx-auto">
            <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Ready to automate?
            </h3>
            <p className="text-muted-foreground mb-4">
              {selectedBusiness 
                ? "Your automation monitoring dashboard is ready. Your CRM system is active and processing form submissions."
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
