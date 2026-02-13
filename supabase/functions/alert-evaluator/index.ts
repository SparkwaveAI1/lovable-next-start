// DISABLED: Investment functionality turned into static mockup
// Original functionality backed up to alert-evaluator.backup

import { corsHeaders } from '../_shared/cors.ts'

const STATIC_MOCKUP_MESSAGE = 'Investment functionality disabled - alert evaluator is now a no-op'

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log(`[DISABLED] Alert evaluator called - ${STATIC_MOCKUP_MESSAGE}`)

  const url = new URL(req.url)
  const endpoint = url.pathname.split('/').pop()

  // Return success response but do nothing
  const response = {
    success: true,
    message: STATIC_MOCKUP_MESSAGE,
    endpoint,
    note: 'This function is now a no-op. Original functionality backed up.'
  }

  // For the evaluate endpoint, return the expected structure
  if (endpoint === 'evaluate') {
    Object.assign(response, {
      evaluated: 0,
      triggered: 0,
      errors: 0,
      results: [],
      executionTimeMs: 0
    })
  }

  return new Response(
    JSON.stringify(response),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }
  )
})