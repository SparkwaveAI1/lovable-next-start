// DISABLED: Investment functionality turned into static mockup
// Original functionality backed up to market-data-refresh.backup

import { corsHeaders } from '../_shared/cors.ts'

const STATIC_MOCKUP_MESSAGE = 'Investment functionality disabled - market data refresh is now a no-op'

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log(`[DISABLED] Market data refresh called - ${STATIC_MOCKUP_MESSAGE}`)

  // Return success response but do nothing
  return new Response(
    JSON.stringify({
      success: true,
      message: STATIC_MOCKUP_MESSAGE,
      processed: 0,
      cached: 0,
      errors: 0,
      duration: '0ms',
      note: 'This function is now a no-op. Original functionality backed up.'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }
  )
})