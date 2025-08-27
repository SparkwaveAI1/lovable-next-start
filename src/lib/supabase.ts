import { supabase } from "@/integrations/supabase/client"
import { Business } from "@/types/business"

// Export the supabase client for backward compatibility
export { supabase }

// Business data functions
export async function getBusinesses(): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error fetching businesses:', error)
    return []
  }
  
  return data || []
}

// Dashboard stats functions
export async function getDashboardStats(businessId?: string) {
  try {
    // Build query with optional business filter
    let query = supabase.from('automation_logs').select('*')
    
    if (businessId) {
      query = query.eq('business_id', businessId)
    }
    
    const { data: logs, error } = await query
    
    if (error) {
      console.error('Error fetching automation logs:', error)
      return {
        activeAutomations: 0,
        todayActivity: 0,
        errors: 0,
        totalRuns: 0,
        successRate: 0
      }
    }

    if (!logs) {
      return {
        activeAutomations: 0,
        todayActivity: 0,
        errors: 0,
        totalRuns: 0,
        successRate: 0
      }
    }

    // Calculate stats
    const totalRuns = logs.length
    const errors = logs.filter(log => log.status === 'error').length
    const successCount = logs.filter(log => log.status === 'success').length
    const successRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0
    
    // Get unique automation types for active automations
    const uniqueAutomations = new Set(logs.map(log => log.automation_type))
    const activeAutomations = uniqueAutomations.size
    
    // Today's activity (logs from today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayActivity = logs.filter(log => {
      const logDate = new Date(log.created_at)
      return logDate >= today
    }).length

    return {
      activeAutomations,
      todayActivity,
      errors,
      totalRuns,
      successRate
    }
  } catch (error) {
    console.error('Error calculating dashboard stats:', error)
    return {
      activeAutomations: 0,
      todayActivity: 0,
      errors: 0,
      totalRuns: 0,
      successRate: 0
    }
  }
}