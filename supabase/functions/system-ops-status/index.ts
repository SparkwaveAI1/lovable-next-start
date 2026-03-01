import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all registered items
    const { data: items, error: fetchError } = await supabase
      .from('system_registry')
      .select('id, name, type, category')

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    const now = new Date().toISOString()
    const results = []

    // Create simple status for each item
    for (const item of items || []) {
      results.push({
        registry_id: item.id,
        status: 'success',
        last_run: now,
        metadata: { auto_check: true }
      })
    }

    // Insert status log
    if (results.length > 0) {
      const { error: insertError } = await supabase
        .from('system_status_log')
        .insert(results)

      if (insertError) {
        throw new Error(insertError.message)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      checked: results.length,
      timestamp: now
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
