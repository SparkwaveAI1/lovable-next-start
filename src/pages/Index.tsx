import { useState, useEffect } from "react"
import { Activity, AlertCircle, Zap, TrendingUp } from "lucide-react"
import { DashboardHeader } from "@/components/DashboardHeader"
import { StatsCard } from "@/components/StatsCard"

import { getDashboardStats } from "@/lib/supabase"
import { ActivityLog } from "@/components/ActivityLog"
import { supabase } from "@/integrations/supabase/client"
// import { GoHighLevelConfig } from "@/components/GoHighLevelConfig"

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
  const [contactForm, setContactForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    comments: ''
  })

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

  const handleTestContact = async () => {
    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          business_id: selectedBusinessId,
          first_name: contactForm.fullName.split(' ')[0] || '',
          last_name: contactForm.fullName.split(' ').slice(1).join(' ') || '',
          email: contactForm.email,
          phone: contactForm.phone,
          comments: contactForm.comments || null,
          source: 'manual_test',
          status: 'new_lead'
        });

      if (error) {
        console.error('Error storing contact:', error);
      } else {
        console.log('Contact stored successfully');
        // Clear form
        setContactForm({ fullName: '', email: '', phone: '', comments: '' });
      }
    } catch (error) {
      console.error('Failed to store contact:', error);
    }
  }

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

        {/* Test Contact Storage Form - Show when business is selected */}
        {selectedBusinessId && (
          <div className="mb-8">
            <div className="bg-card p-6 rounded-lg border border-border shadow-card">
              <h3 className="text-lg font-medium text-foreground mb-4">Test Contact Storage</h3>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Full Name"
                  value={contactForm.fullName}
                  onChange={(e) => setContactForm(prev => ({...prev, fullName: e.target.value}))}
                  className="w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input 
                  type="email" 
                  placeholder="Email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({...prev, email: e.target.value}))}
                  className="w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input 
                  type="tel" 
                  placeholder="Phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({...prev, phone: e.target.value}))}
                  className="w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <textarea 
                  placeholder="Comments (optional)"
                  value={contactForm.comments}
                  onChange={(e) => setContactForm(prev => ({...prev, comments: e.target.value}))}
                  className="w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                />
                <button
                  onClick={handleTestContact}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                  Test Store Contact
                </button>
              </div>
            </div>
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
          <ActivityLog businessId={selectedBusinessId} />
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
