import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Activity {
  id?: string
  type: 'task_created' | 'task_updated' | 'message_sent' | 'document_created' | 'status_changed' | 'agent_assigned'
  agent_id: string
  task_id?: string
  message: string
  metadata?: Record<string, any>
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const activityId = url.searchParams.get('id')
    const agentId = url.searchParams.get('agent_id')
    const taskId = url.searchParams.get('task_id')
    const type = url.searchParams.get('type')
    const limit = url.searchParams.get('limit') || '50'
    const offset = url.searchParams.get('offset') || '0'

    switch (req.method) {
      case 'GET': {
        // Get activity feed with filters
        let query = supabase
          .from('mc_activities')
          .select(`
            *,
            agent:mc_agents!agent_id(id, name, role, avatar_url),
            task:mc_tasks(id, title, status)
          `)
          .order('created_at', { ascending: false })
          .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

        if (activityId) {
          query = query.eq('id', activityId)
        }
        if (agentId) {
          query = query.eq('agent_id', agentId)
        }
        if (taskId) {
          query = query.eq('task_id', taskId)
        }
        if (type) {
          query = query.eq('type', type)
        }

        const { data, error, count } = await query

        if (error) throw error

        // Get total count for pagination
        const { count: totalCount } = await supabase
          .from('mc_activities')
          .select('*', { count: 'exact', head: true })

        return new Response(JSON.stringify({ 
          data, 
          pagination: {
            offset: parseInt(offset),
            limit: parseInt(limit),
            total: totalCount
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'POST': {
        // Create new activity (manual logging)
        const activityData: Activity = await req.json()

        // Validate required fields
        if (!activityData.type || !activityData.agent_id || !activityData.message) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields: type, agent_id, message' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          })
        }

        const { data, error } = await supabase
          .from('mc_activities')
          .insert({
            type: activityData.type,
            agent_id: activityData.agent_id,
            task_id: activityData.task_id,
            message: activityData.message,
            metadata: activityData.metadata || {}
          })
          .select(`
            *,
            agent:mc_agents!agent_id(id, name, role, avatar_url),
            task:mc_tasks(id, title, status)
          `)

        if (error) throw error

        return new Response(JSON.stringify({ data: data[0] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405
        })
    }
  } catch (error) {
    console.error('Error in mission-control-activities:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})