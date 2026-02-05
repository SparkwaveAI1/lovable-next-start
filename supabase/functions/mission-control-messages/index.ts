import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Message {
  id?: string
  task_id: string
  from_agent_id: string
  content: string
  attachments?: string[]
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
    const messageId = url.searchParams.get('id')
    const taskId = url.searchParams.get('task_id')
    const limit = url.searchParams.get('limit') || '100'

    switch (req.method) {
      case 'GET': {
        // Get messages, optionally filtered by task
        let query = supabase
          .from('mc_messages')
          .select(`
            *,
            from_agent:mc_agents!from_agent_id(id, name, role, avatar_url),
            task:mc_tasks!task_id(id, title)
          `)
          .order('created_at', { ascending: true })
          .limit(parseInt(limit))

        if (messageId) {
          query = query.eq('id', messageId)
        }
        if (taskId) {
          query = query.eq('task_id', taskId)
        }

        const { data, error } = await query

        if (error) throw error

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'POST': {
        // Create new message/comment
        const messageData: Message = await req.json()

        // Validate required fields
        if (!messageData.task_id || !messageData.from_agent_id || !messageData.content) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields: task_id, from_agent_id, content' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          })
        }

        const { data, error } = await supabase
          .from('mc_messages')
          .insert({
            task_id: messageData.task_id,
            from_agent_id: messageData.from_agent_id,
            content: messageData.content,
            attachments: messageData.attachments || []
          })
          .select(`
            *,
            from_agent:mc_agents!from_agent_id(id, name, role, avatar_url),
            task:mc_tasks!task_id(id, title)
          `)

        if (error) throw error

        // Create activity for the message
        await supabase
          .from('mc_activities')
          .insert({
            type: 'message_sent',
            agent_id: messageData.from_agent_id,
            task_id: messageData.task_id,
            message: `New comment on task`,
            metadata: {
              message_id: data[0].id,
              content_preview: messageData.content.substring(0, 100)
            }
          })

        return new Response(JSON.stringify({ data: data[0] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201
        })
      }

      case 'PUT': {
        // Update message (edit comment)
        if (!messageId) {
          return new Response(JSON.stringify({ error: 'Message ID required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          })
        }

        const messageData: Partial<Message> = await req.json()

        const { data, error } = await supabase
          .from('mc_messages')
          .update({
            content: messageData.content,
            attachments: messageData.attachments
          })
          .eq('id', messageId)
          .select(`
            *,
            from_agent:mc_agents!from_agent_id(id, name, role, avatar_url),
            task:mc_tasks!task_id(id, title)
          `)

        if (error) throw error

        return new Response(JSON.stringify({ data: data[0] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'DELETE': {
        // Delete message
        if (!messageId) {
          return new Response(JSON.stringify({ error: 'Message ID required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          })
        }

        const { error } = await supabase
          .from('mc_messages')
          .delete()
          .eq('id', messageId)

        if (error) throw error

        return new Response(JSON.stringify({ message: 'Message deleted' }), {
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
    console.error('Error in mission-control-messages:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})