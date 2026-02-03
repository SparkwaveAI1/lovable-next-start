import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Agent {
  id?: string
  name: string
  role: string
  level: 'lead' | 'specialist' | 'intern'
  status: 'idle' | 'working' | 'blocked'
  current_task_id?: string
  session_key?: string
  avatar_url?: string
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const agentId = url.searchParams.get('id')
    const sessionKey = url.searchParams.get('session_key')
    const status = url.searchParams.get('status')

    switch (req.method) {
      case 'GET': {
        // Get agents with optional filters
        let query = supabase
          .from('agents')
          .select(`
            *,
            current_task:tasks(id, title, status, priority)
          `)
          .order('created_at', { ascending: true })

        if (agentId) {
          query = query.eq('id', agentId)
        }
        if (sessionKey) {
          query = query.eq('session_key', sessionKey)
        }
        if (status) {
          query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) throw error

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'POST': {
        // Create new agent
        const agentData: Agent = await req.json()

        // Validate required fields
        if (!agentData.name || !agentData.role || !agentData.level) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields: name, role, level' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          })
        }

        const { data, error } = await supabase
          .from('agents')
          .insert({
            name: agentData.name,
            role: agentData.role,
            level: agentData.level,
            status: agentData.status || 'idle',
            session_key: agentData.session_key,
            avatar_url: agentData.avatar_url
          })
          .select(`
            *,
            current_task:tasks(id, title, status, priority)
          `)

        if (error) throw error

        // Create activity for new agent
        await supabase
          .from('activities')
          .insert({
            type: 'status_changed',
            agent_id: data[0].id,
            message: `New agent ${agentData.name} joined as ${agentData.role}`,
            metadata: {
              action: 'agent_created',
              level: agentData.level
            }
          })

        return new Response(JSON.stringify({ data: data[0] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201
        })
      }

      case 'PUT': {
        // Update agent
        if (!agentId) {
          return new Response(JSON.stringify({ error: 'Agent ID required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          })
        }

        const agentData: Partial<Agent> = await req.json()

        // Get current agent data to check for status changes
        const { data: currentAgent } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .single()

        const { data, error } = await supabase
          .from('agents')
          .update(agentData)
          .eq('id', agentId)
          .select(`
            *,
            current_task:tasks(id, title, status, priority)
          `)

        if (error) throw error

        // Create activity if status changed
        if (currentAgent && agentData.status && currentAgent.status !== agentData.status) {
          await supabase
            .from('activities')
            .insert({
              type: 'status_changed',
              agent_id: agentId,
              task_id: agentData.current_task_id,
              message: `${currentAgent.name} status changed from ${currentAgent.status} to ${agentData.status}`,
              metadata: {
                old_status: currentAgent.status,
                new_status: agentData.status,
                current_task_id: agentData.current_task_id
              }
            })
        }

        return new Response(JSON.stringify({ data: data[0] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'DELETE': {
        // Delete agent (rarely used)
        if (!agentId) {
          return new Response(JSON.stringify({ error: 'Agent ID required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          })
        }

        const { error } = await supabase
          .from('agents')
          .delete()
          .eq('id', agentId)

        if (error) throw error

        return new Response(JSON.stringify({ message: 'Agent deleted' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405
        })
    }
  } catch (error) {
    console.error('Error in mission-control-agents:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})