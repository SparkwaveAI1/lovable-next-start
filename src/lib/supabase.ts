import { createClient } from '@supabase/supabase-js'

// These will be configured when we set up the Supabase integration
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Mock data for development until Supabase is configured
export const mockBusinesses = [
  {
    id: '1',
    name: 'Fight Flow Academy',
    slug: 'fight-flow-academy',
    description: 'Martial arts training and community',
    active: true
  },
  {
    id: '2',
    name: 'Sparkwave AI',
    slug: 'sparkwave-ai',
    description: 'AI automation solutions',
    active: true
  },
  {
    id: '3',
    name: 'PersonaAI',
    slug: 'persona-ai',
    description: 'AI-powered persona generation',
    active: true
  },
  {
    id: '4',
    name: 'CharX World',
    slug: 'charx-world',
    description: 'Character creation platform',
    active: true
  }
]

export const mockStats = {
  activeAutomations: 0,
  todayActivity: 0,
  errors: 0,
  totalRuns: 0,
  successRate: 0
}