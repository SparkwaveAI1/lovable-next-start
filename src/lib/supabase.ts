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

export const mockStats = {
  activeAutomations: 0,
  todayActivity: 0,
  errors: 0,
  totalRuns: 0,
  successRate: 0
}