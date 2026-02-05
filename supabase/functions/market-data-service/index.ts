import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY') || ''

const CACHE_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const HISTORY_CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours for historical data

// Unified quote data schema
interface QuoteData {
  symbol: string
  assetType: 'stock' | 'crypto'
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  previousClose: number
  timestamp: string
}

interface CacheEntry {
  symbol: string
  asset_type: string
  data: QuoteData
  fetched_at: string
  expires_at: string
}

// Historical price data schema
interface HistoricalData {
  symbol: string
  assetType: 'stock' | 'crypto'
  prices: number[] // Array of daily close prices
  timestamps: string[] // Corresponding ISO timestamps
  days: number
}

interface HistoryCacheEntry {
  symbol: string
  asset_type: string
  days: number
  data: HistoricalData
  fetched_at: string
  expires_at: string
}

// Rate limiting state (in-memory, resets on cold start)
let lastPolygonCall = 0
const POLYGON_MIN_INTERVAL_MS = 12000 // 5 calls/min = 1 call per 12 seconds

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============ POLYGON.IO (STOCKS) ============

async function fetchStockFromPolygon(symbol: string): Promise<QuoteData | null> {
  // Rate limit check
  const now = Date.now()
  if (now - lastPolygonCall < POLYGON_MIN_INTERVAL_MS) {
    console.log(`Rate limiting Polygon API call for ${symbol}`)
    return null
  }
  
  if (!POLYGON_API_KEY) {
    console.error('POLYGON_API_KEY not configured')
    return null
  }
  
  lastPolygonCall = now
  const upperSymbol = symbol.toUpperCase()
  
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${upperSymbol}/prev?apiKey=${POLYGON_API_KEY}`
    const response = await fetch(url)
    
    if (response.status === 429) {
      console.error('Polygon API rate limit exceeded')
      return null
    }
    
    if (!response.ok) {
      console.error(`Polygon API error: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data = await response.json()
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error(`Polygon: No data for symbol ${upperSymbol}`)
      return null
    }
    
    const result = data.results[0]
    const change = result.c - result.o
    const changePercent = (change / result.o) * 100
    
    return {
      symbol: upperSymbol,
      assetType: 'stock',
      price: result.c, // close price
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: result.v,
      high: result.h,
      low: result.l,
      open: result.o,
      previousClose: result.c, // prev day close = current close for /prev endpoint
      timestamp: new Date(result.t).toISOString(),
    }
  } catch (error) {
    console.error(`Polygon fetch error for ${upperSymbol}:`, error)
    return null
  }
}

// ============ COINGECKO (CRYPTO) ============

async function fetchCryptoFromCoinGecko(symbol: string): Promise<QuoteData | null> {
  const lowerSymbol = symbol.toLowerCase()
  
  try {
    // CoinGecko expects coin IDs (bitcoin, ethereum) not ticker symbols
    const url = `https://api.coingecko.com/api/v3/coins/${lowerSymbol}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    })
    
    if (response.status === 429) {
      console.error('CoinGecko API rate limit exceeded')
      return null
    }
    
    if (response.status === 404) {
      console.error(`CoinGecko: Coin not found: ${lowerSymbol}`)
      return null
    }
    
    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data = await response.json()
    const market = data.market_data
    
    if (!market) {
      console.error(`CoinGecko: No market data for ${lowerSymbol}`)
      return null
    }
    
    return {
      symbol: data.symbol?.toUpperCase() || lowerSymbol.toUpperCase(),
      assetType: 'crypto',
      price: market.current_price?.usd || 0,
      change: market.price_change_24h || 0,
      changePercent: market.price_change_percentage_24h || 0,
      volume: market.total_volume?.usd || 0,
      high: market.high_24h?.usd || 0,
      low: market.low_24h?.usd || 0,
      open: (market.current_price?.usd || 0) - (market.price_change_24h || 0),
      previousClose: (market.current_price?.usd || 0) - (market.price_change_24h || 0),
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`CoinGecko fetch error for ${lowerSymbol}:`, error)
    return null
  }
}

// ============ HISTORICAL DATA FETCHING ============

async function fetchCryptoHistoryFromCoinGecko(symbol: string, days: number): Promise<HistoricalData | null> {
  const lowerSymbol = symbol.toLowerCase()
  
  try {
    // CoinGecko market_chart endpoint returns prices array
    const url = `https://api.coingecko.com/api/v3/coins/${lowerSymbol}/market_chart?vs_currency=usd&days=${days}`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    })
    
    if (response.status === 429) {
      console.error('CoinGecko API rate limit exceeded')
      return null
    }
    
    if (response.status === 404) {
      console.error(`CoinGecko: Coin not found: ${lowerSymbol}`)
      return null
    }
    
    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data = await response.json()
    
    if (!data.prices || data.prices.length === 0) {
      console.error(`CoinGecko: No price history for ${lowerSymbol}`)
      return null
    }
    
    // CoinGecko returns [[timestamp_ms, price], ...]
    // For 7 days, we get data points every ~1 hour, so we sample daily
    const prices: number[] = []
    const timestamps: string[] = []
    
    // Sample one price per day (take first data point of each day)
    const msPerDay = 24 * 60 * 60 * 1000
    let lastDay = -1
    
    for (const [ts, price] of data.prices) {
      const dayNum = Math.floor(ts / msPerDay)
      if (dayNum !== lastDay) {
        prices.push(price)
        timestamps.push(new Date(ts).toISOString())
        lastDay = dayNum
      }
    }
    
    return {
      symbol: lowerSymbol,
      assetType: 'crypto',
      prices,
      timestamps,
      days,
    }
  } catch (error) {
    console.error(`CoinGecko history fetch error for ${lowerSymbol}:`, error)
    return null
  }
}

async function fetchStockHistoryFromPolygon(symbol: string, days: number): Promise<HistoricalData | null> {
  // Rate limit check
  const now = Date.now()
  if (now - lastPolygonCall < POLYGON_MIN_INTERVAL_MS) {
    console.log(`Rate limiting Polygon API call for ${symbol} history`)
    return null
  }
  
  if (!POLYGON_API_KEY) {
    console.error('POLYGON_API_KEY not configured')
    return null
  }
  
  lastPolygonCall = now
  const upperSymbol = symbol.toUpperCase()
  
  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))
    
    const from = startDate.toISOString().split('T')[0]
    const to = endDate.toISOString().split('T')[0]
    
    const url = `https://api.polygon.io/v2/aggs/ticker/${upperSymbol}/range/1/day/${from}/${to}?apiKey=${POLYGON_API_KEY}`
    const response = await fetch(url)
    
    if (response.status === 429) {
      console.error('Polygon API rate limit exceeded')
      return null
    }
    
    if (!response.ok) {
      console.error(`Polygon API error: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data = await response.json()
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error(`Polygon: No history data for ${upperSymbol}`)
      return null
    }
    
    const prices = data.results.map((r: { c: number }) => r.c)
    const timestamps = data.results.map((r: { t: number }) => new Date(r.t).toISOString())
    
    return {
      symbol: upperSymbol,
      assetType: 'stock',
      prices,
      timestamps,
      days,
    }
  } catch (error) {
    console.error(`Polygon history fetch error for ${upperSymbol}:`, error)
    return null
  }
}

// ============ HISTORY CACHE OPERATIONS ============

async function getCachedHistory(symbol: string, assetType: 'stock' | 'crypto', days: number): Promise<HistoricalData | null> {
  const normalizedSymbol = assetType === 'stock' ? symbol.toUpperCase() : symbol.toLowerCase()
  
  const { data, error } = await supabase
    .from('market_history_cache')
    .select('*')
    .eq('symbol', normalizedSymbol)
    .eq('asset_type', assetType)
    .eq('days', days)
    .single()
  
  if (error || !data) {
    return null
  }
  
  const entry = data as HistoryCacheEntry
  const expiresAt = new Date(entry.expires_at).getTime()
  
  if (Date.now() > expiresAt) {
    return null // expired
  }
  
  return entry.data
}

async function setCachedHistory(history: HistoricalData, originalSymbol: string): Promise<void> {
  const normalizedSymbol = history.assetType === 'stock' 
    ? history.symbol.toUpperCase() 
    : originalSymbol.toLowerCase()
  
  const now = new Date()
  const expiresAt = new Date(now.getTime() + HISTORY_CACHE_DURATION_MS)
  
  const { error } = await supabase
    .from('market_history_cache')
    .upsert({
      symbol: normalizedSymbol,
      asset_type: history.assetType,
      days: history.days,
      data: history,
      fetched_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'symbol,asset_type,days'
    })
  
  if (error) {
    console.error('History cache write error:', error)
  }
}

async function getHistory(symbol: string, assetType: 'stock' | 'crypto', days: number): Promise<{ data: HistoricalData | null, source: string, error?: string }> {
  // Check cache first
  const cached = await getCachedHistory(symbol, assetType, days)
  if (cached) {
    return { data: cached, source: 'cache' }
  }
  
  // Fetch fresh data
  let fresh: HistoricalData | null = null
  
  if (assetType === 'stock') {
    fresh = await fetchStockHistoryFromPolygon(symbol, days)
  } else {
    fresh = await fetchCryptoHistoryFromCoinGecko(symbol, days)
  }
  
  if (fresh) {
    await setCachedHistory(fresh, symbol)
    return { data: fresh, source: 'api' }
  }
  
  return { data: null, source: 'none', error: `Unable to fetch history for ${symbol}` }
}

// ============ CACHE OPERATIONS ============

async function getCachedQuote(symbol: string, assetType: 'stock' | 'crypto'): Promise<QuoteData | null> {
  const normalizedSymbol = assetType === 'stock' ? symbol.toUpperCase() : symbol.toLowerCase()
  
  const { data, error } = await supabase
    .from('market_data_cache')
    .select('*')
    .eq('symbol', normalizedSymbol)
    .eq('asset_type', assetType)
    .single()
  
  if (error || !data) {
    return null
  }
  
  const entry = data as CacheEntry
  const expiresAt = new Date(entry.expires_at).getTime()
  
  if (Date.now() > expiresAt) {
    return null // expired
  }
  
  return entry.data
}

async function getStaleCache(symbol: string, assetType: 'stock' | 'crypto'): Promise<QuoteData | null> {
  const normalizedSymbol = assetType === 'stock' ? symbol.toUpperCase() : symbol.toLowerCase()
  
  const { data, error } = await supabase
    .from('market_data_cache')
    .select('data')
    .eq('symbol', normalizedSymbol)
    .eq('asset_type', assetType)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return (data as { data: QuoteData }).data
}

async function setCachedQuote(quote: QuoteData, originalSymbol: string): Promise<void> {
  // For cache key, use the original symbol (e.g., "bitcoin" not "BTC")
  const normalizedSymbol = quote.assetType === 'stock' 
    ? quote.symbol.toUpperCase() 
    : originalSymbol.toLowerCase()
  
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CACHE_DURATION_MS)
  
  const { error } = await supabase
    .from('market_data_cache')
    .upsert({
      symbol: normalizedSymbol,
      asset_type: quote.assetType,
      data: quote,
      fetched_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'symbol,asset_type'
    })
  
  if (error) {
    console.error('Cache write error:', error)
  }
}

// ============ QUOTE FETCHING ============

async function getQuote(symbol: string, assetType: 'stock' | 'crypto'): Promise<{ data: QuoteData | null, source: string, error?: string }> {
  // Check cache first
  const cached = await getCachedQuote(symbol, assetType)
  if (cached) {
    return { data: cached, source: 'cache' }
  }
  
  // Fetch fresh data
  let fresh: QuoteData | null = null
  
  if (assetType === 'stock') {
    fresh = await fetchStockFromPolygon(symbol)
  } else {
    fresh = await fetchCryptoFromCoinGecko(symbol)
  }
  
  if (fresh) {
    await setCachedQuote(fresh, symbol)
    return { data: fresh, source: 'api' }
  }
  
  // Fallback to stale cache if API failed
  const stale = await getStaleCache(symbol, assetType)
  if (stale) {
    return { data: stale, source: 'stale_cache', error: 'API unavailable, returning stale data' }
  }
  
  return { data: null, source: 'none', error: `Unable to fetch data for ${symbol}` }
}

// ============ TECHNICAL INDICATORS ============

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50 // Not enough data
  
  let gains = 0
  let losses = 0
  
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }
  
  const avgGain = gains / period
  const avgLoss = losses / period
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

async function getIndicators(symbol: string, assetType: 'stock' | 'crypto'): Promise<{ rsi: number, sma20: number, sma50: number, currentPrice: number } | null> {
  // For now, return mock indicators based on current quote
  // In production, you'd fetch historical data and calculate properly
  const quote = await getQuote(symbol, assetType)
  
  if (!quote.data) {
    return null
  }
  
  const price = quote.data.price
  const change = quote.data.changePercent
  
  // Approximate RSI from price change (simplified)
  let rsi = 50 + (change * 2)
  rsi = Math.max(0, Math.min(100, rsi))
  
  return {
    rsi: parseFloat(rsi.toFixed(2)),
    sma20: parseFloat((price * 0.98).toFixed(2)), // Approximation
    sma50: parseFloat((price * 0.95).toFixed(2)), // Approximation
    currentPrice: price,
  }
}

// ============ REQUEST HANDLERS ============

async function handleQuote(url: URL): Promise<Response> {
  const symbol = url.searchParams.get('symbol')
  const type = url.searchParams.get('type') as 'stock' | 'crypto' | null
  
  if (!symbol) {
    return new Response(JSON.stringify({ error: 'Missing symbol parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  if (!type || !['stock', 'crypto'].includes(type)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing type parameter (stock|crypto)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const result = await getQuote(symbol, type)
  
  if (!result.data) {
    return new Response(JSON.stringify({ error: result.error || 'Symbol not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  return new Response(JSON.stringify({
    data: result.data,
    meta: {
      source: result.source,
      cachedUntil: new Date(Date.now() + CACHE_DURATION_MS).toISOString(),
      ...(result.error && { warning: result.error })
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleBatch(url: URL): Promise<Response> {
  const symbolsParam = url.searchParams.get('symbols')
  const type = url.searchParams.get('type') as 'stock' | 'crypto' | null
  
  if (!symbolsParam) {
    return new Response(JSON.stringify({ error: 'Missing symbols parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  if (!type || !['stock', 'crypto'].includes(type)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing type parameter (stock|crypto)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10)
  
  if (symbols.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid symbols provided' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const results: Record<string, QuoteData | { error: string }> = {}
  
  // Process sequentially to respect rate limits
  for (const symbol of symbols) {
    const result = await getQuote(symbol, type)
    if (result.data) {
      results[symbol.toUpperCase()] = result.data
    } else {
      results[symbol.toUpperCase()] = { error: result.error || 'Failed to fetch' }
    }
  }
  
  return new Response(JSON.stringify({
    data: results,
    meta: {
      requested: symbols.length,
      successful: Object.values(results).filter(r => !('error' in r)).length,
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleIndicators(url: URL): Promise<Response> {
  const symbol = url.searchParams.get('symbol')
  const type = url.searchParams.get('type') as 'stock' | 'crypto' | null
  
  if (!symbol) {
    return new Response(JSON.stringify({ error: 'Missing symbol parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  if (!type || !['stock', 'crypto'].includes(type)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing type parameter (stock|crypto)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const indicators = await getIndicators(symbol, type)
  
  if (!indicators) {
    return new Response(JSON.stringify({ error: 'Unable to calculate indicators' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  return new Response(JSON.stringify({
    symbol: symbol.toUpperCase(),
    assetType: type,
    indicators,
    note: 'Indicators are approximations. For accurate values, use historical data endpoints.'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleRefresh(req: Request, url: URL): Promise<Response> {
  // Admin only - check for service role key in auth header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY.substring(0, 20))) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const body = await req.json().catch(() => ({}))
  const symbol = body.symbol
  const type = body.type as 'stock' | 'crypto' | undefined
  
  if (!symbol || !type) {
    return new Response(JSON.stringify({ error: 'Missing symbol or type in request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Delete existing cache entry
  const normalizedSymbol = type === 'stock' ? symbol.toUpperCase() : symbol.toLowerCase()
  await supabase
    .from('market_data_cache')
    .delete()
    .eq('symbol', normalizedSymbol)
    .eq('asset_type', type)
  
  // Fetch fresh data
  const result = await getQuote(symbol, type)
  
  return new Response(JSON.stringify({
    success: true,
    data: result.data,
    message: `Cache refreshed for ${symbol}`
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// ============ MAIN HANDLER ============

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  const url = new URL(req.url)
  const path = url.pathname.replace('/market-data-service', '').replace(/^\/+/, '')
  
  try {
    switch (path) {
      case 'quote':
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return await handleQuote(url)
      
      case 'batch':
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return await handleBatch(url)
      
      case 'indicators':
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return await handleIndicators(url)
      
      case 'refresh':
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return await handleRefresh(req, url)
      
      default:
        return new Response(JSON.stringify({
          service: 'market-data-service',
          version: '1.0.0',
          endpoints: [
            'GET /quote?symbol=AAPL&type=stock',
            'GET /quote?symbol=bitcoin&type=crypto',
            'GET /batch?symbols=AAPL,GOOGL&type=stock',
            'GET /indicators?symbol=AAPL&type=stock',
            'POST /refresh (admin only)',
          ],
          cacheExpiry: '15 minutes',
          sources: {
            stocks: 'Polygon.io',
            crypto: 'CoinGecko',
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
