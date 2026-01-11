import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FredObservation {
  date: string
  value: string
}

interface FredResponse {
  observations: FredObservation[]
}

async function fetchFredSeries(seriesId: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`
    console.log(`Fetching FRED series: ${seriesId}`)
    
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`FRED API error for ${seriesId}: ${response.status}`)
      return null
    }
    
    const data: FredResponse = await response.json()
    if (data.observations && data.observations.length > 0) {
      const value = parseFloat(data.observations[0].value)
      console.log(`${seriesId}: ${value}`)
      return isNaN(value) ? null : value
    }
    return null
  } catch (error: any) {
    console.error(`Error fetching ${seriesId}:`, error)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const fredApiKey = Deno.env.get('FRED_API_KEY')
    if (!fredApiKey) {
      throw new Error('FRED_API_KEY not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('=== Starting Crisis Data Update ===')

    // Fetch all FRED indicators in parallel
    const [sofr, iorb, rrp] = await Promise.all([
      fetchFredSeries('SOFR', fredApiKey),      // Secured Overnight Financing Rate
      fetchFredSeries('IORB', fredApiKey),      // Interest on Reserve Balances
      fetchFredSeries('RRPONTSYD', fredApiKey), // Overnight Reverse Repurchase Agreements
    ])

    const updates: Array<{
      indicator_key: string
      indicator_name: string
      value: number | null
      unit: string
      source: string
    }> = []

    // SOFR-IORB Spread calculation
    if (sofr !== null && iorb !== null) {
      const spread = (sofr - iorb) * 100 // Convert to basis points
      updates.push({
        indicator_key: 'sofr_iorb_spread',
        indicator_name: 'SOFR-IORB Spread',
        value: Math.round(spread * 10) / 10, // Round to 1 decimal
        unit: 'bps',
        source: 'FRED (SOFR, IORB)'
      })
    }

    // Reverse Repo (convert to trillions)
    if (rrp !== null) {
      const rrpTrillions = rrp / 1000 // FRED reports in billions
      updates.push({
        indicator_key: 'reverse_repo',
        indicator_name: 'Reverse Repo Facility',
        value: Math.round(rrpTrillions * 100) / 100, // Round to 2 decimals
        unit: 'T',
        source: 'FRED (RRPONTSYD)'
      })
    }

    // Store individual rates for reference
    if (sofr !== null) {
      updates.push({
        indicator_key: 'sofr_rate',
        indicator_name: 'SOFR Rate',
        value: Math.round(sofr * 100) / 100,
        unit: '%',
        source: 'FRED (SOFR)'
      })
    }

    if (iorb !== null) {
      updates.push({
        indicator_key: 'iorb_rate',
        indicator_name: 'IORB Rate',
        value: Math.round(iorb * 100) / 100,
        unit: '%',
        source: 'FRED (IORB)'
      })
    }

    // Upsert all indicators
    for (const update of updates) {
      const { error } = await supabase
        .from('crisis_indicators')
        .upsert({
          ...update,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'indicator_key'
        })

      if (error) {
        console.error(`Error updating ${update.indicator_key}:`, error)
      } else {
        console.log(`Updated ${update.indicator_key}: ${update.value} ${update.unit}`)
      }
    }

    console.log('=== Crisis Data Update Complete ===')

    return new Response(
      JSON.stringify({
        success: true,
        updated: updates.length,
        indicators: updates.map(u => ({ key: u.indicator_key, value: u.value })),
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Crisis data update error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})