import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface RefreshResult {
  symbol: string
  assetType: string
  success: boolean
  error?: string
}

interface RefreshStats {
  stocksRequested: number
  stocksRefreshed: number
  cryptoRequested: number
  cryptoRefreshed: number
  errors: string[]
  durationMs: number
}

/**
 * Get all unique symbols from watchlist_items, grouped by asset_type
 */
async function getTrackedSymbols(): Promise<{ stocks: string[], crypto: string[] }> {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('symbol, asset_type')
  
  if (error) {
    console.error('Error fetching watchlist items:', error)
    return { stocks: [], crypto: [] }
  }
  
  const stocks = new Set<string>()
  const crypto = new Set<string>()
  
  for (const item of data || []) {
    if (item.asset_type === 'stock') {
      stocks.add(item.symbol.toUpperCase())
    } else if (item.asset_type === 'crypto') {
      crypto.add(item.symbol.toLowerCase())
    }
  }
  
  return {
    stocks: Array.from(stocks),
    crypto: Array.from(crypto)
  }
}

/**
 * Refresh a single symbol via market-data-service
 */
async function refreshSymbol(symbol: string, assetType: 'stock' | 'crypto'): Promise<RefreshResult> {
  try {
    // Call market-data-service refresh endpoint
    const response = await fetch(`${SUPABASE_URL}/functions/v1/market-data-service/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol, type: assetType })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return {
        symbol,
        assetType,
        success: false,
        error: `HTTP ${response.status}: ${errorText}`
      }
    }
    
    const result = await response.json()
    return {
      symbol,
      assetType,
      success: result.success || !!result.data,
      error: result.error
    }
  } catch (err) {
    return {
      symbol,
      assetType,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

/**
 * Process symbols in batches with delay to respect rate limits
 */
async function refreshBatch(
  symbols: string[], 
  assetType: 'stock' | 'crypto',
  delayMs: number = 1000
): Promise<RefreshResult[]> {
  const results: RefreshResult[] = []
  
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]
    const result = await refreshSymbol(symbol, assetType)
    results.push(result)
    
    // Add delay between requests to respect rate limits
    if (i < symbols.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  return results
}

/**
 * Log refresh results to the monitoring table
 */
async function logRefreshResults(stats: RefreshStats): Promise<void> {
  const { error } = await supabase
    .from('market_data_refresh_log')
    .insert({
      symbols_refreshed: stats.stocksRefreshed + stats.cryptoRefreshed,
      stocks_refreshed: stats.stocksRefreshed,
      crypto_refreshed: stats.cryptoRefreshed,
      total_requested: stats.stocksRequested + stats.cryptoRequested,
      errors: stats.errors,
      duration_ms: stats.durationMs
    })
  
  if (error) {
    console.error('Error logging refresh results:', error)
  }
}

/**
 * Main refresh handler
 */
async function handleRefresh(req: Request): Promise<Response> {
  // Verify authorization (service role or specific header)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.includes('Bearer')) {
    return new Response(JSON.stringify({ error: 'Authorization required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const startTime = Date.now()
  const errors: string[] = []
  
  console.log('Starting market data refresh job...')
  
  // Get all tracked symbols
  const { stocks, crypto } = await getTrackedSymbols()
  
  console.log(`Found ${stocks.length} stocks and ${crypto.length} crypto to refresh`)
  
  // Process stocks (with 13s delay due to Polygon.io 5 calls/min limit)
  const stockResults = await refreshBatch(stocks, 'stock', 13000)
  const stocksRefreshed = stockResults.filter(r => r.success).length
  
  for (const result of stockResults) {
    if (!result.success && result.error) {
      errors.push(`${result.assetType}:${result.symbol}: ${result.error}`)
    }
  }
  
  // Process crypto (with 1.5s delay for CoinGecko rate limits)
  const cryptoResults = await refreshBatch(crypto, 'crypto', 1500)
  const cryptoRefreshed = cryptoResults.filter(r => r.success).length
  
  for (const result of cryptoResults) {
    if (!result.success && result.error) {
      errors.push(`${result.assetType}:${result.symbol}: ${result.error}`)
    }
  }
  
  const durationMs = Date.now() - startTime
  
  const stats: RefreshStats = {
    stocksRequested: stocks.length,
    stocksRefreshed,
    cryptoRequested: crypto.length,
    cryptoRefreshed,
    errors,
    durationMs
  }
  
  // Log to monitoring table
  await logRefreshResults(stats)
  
  console.log(`Market data refresh complete:`, stats)
  
  return new Response(JSON.stringify({
    success: true,
    stats: {
      stocks: { requested: stocks.length, refreshed: stocksRefreshed },
      crypto: { requested: crypto.length, refreshed: cryptoRefreshed },
      totalErrors: errors.length,
      durationMs
    },
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Return first 10 errors
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  try {
    return await handleRefresh(req)
  } catch (error) {
    console.error('Unhandled error in market-data-refresh:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
