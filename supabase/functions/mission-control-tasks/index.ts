import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Task {
  id?: string
  title: string
  description?: string
  status: 'inbox' | 'assigned' | 'in_progress' | 'review' | 'done' | 'blocked'
  assignee_ids?: string[]
  tags?: string[]
  priority: 'urgent' | 'high' | 'medium' | 'low'
  external_id?: string
  external_source?: 'notion' | 'manual'
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
    const taskId = url.searchParams.get('id')
    const status = url.searchParams.get('status')
    const assignee = url.searchParams.get('assignee')
    const limit = url.searchParams.get('limit') || '50'

    switch (req.method) {
      case 'GET': {
        // Get tasks with filters
        let query = supabase
          .from('tasks')
          .select(`
            *,
            assignees:agents!inner(id, name, role)
          `)
          .order('created_at', { ascending: false })
          .limit(parseInt(limit))

        if (taskId) {
          query = query.eq('id', taskId)
        }
        if (status) {
          query = query.eq('status', status)
        }
        if (assignee) {
          query = query.contains('assignee_ids', [assignee])
        }

        const { data, error } = await query

        if (error) throw error

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'POST': {
        // Create new task
        const taskData: Task = await req.json()

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            ...taskData,
            assignee_ids: taskData.assignee_ids || [],
            tags: taskData.tags || [],
            priority: taskData.priority || 'medium',
            status: taskData.status || 'inbox',
            external_source: taskData.external_source || 'manual'
          })
          .select()

        if (error) throw error

        return new Response(JSON.stringify({ data: data[0] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201
        })
      }

      case 'PUT': {
        // Update task
        if (!taskId) {
          return new Response(JSON.stringify({ error: 'Task ID required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          })
        }

        const taskData: Partial<Task> = await req.json()

        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', taskId)
          .select()

        if (error) throw error

        return new Response(JSON.stringify({ data: data[0] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'DELETE': {
        // Delete task
        if (!taskId) {
          return new Response(JSON.stringify({ error: 'Task ID required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          })
        }

        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)

        if (error) throw error

        return new Response(JSON.stringify({ message: 'Task deleted' }), {
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
    console.error('Error in mission-control-tasks:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})