/**
 * Screener Engine Edge Function
 * INV-037: Evaluates screening rules against market data
 * 
 * Endpoints:
 * - POST /run - Execute screener against securities (cached or universe)
 * - POST /test - Test screener against a single symbol
 * - GET /presets - Return preset screener profiles
 * 
 * Universe options:
 * - 'cached' (default): Only screen cached data (fast)
 * - 'popular': Top 50 stocks + top 30 crypto (live fetch)
 * - 'crypto_only': Top 30 crypto only (faster, no rate limit issues)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MARKET_DATA_SERVICE_URL = `${SUPABASE_URL}/functions/v1/market-data-service`

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============ SECURITY UNIVERSES ============

// Top 50 stocks by market cap (use Polygon)
const STOCK_UNIVERSE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JPM', 'JNJ',
  'V', 'UNH', 'HD', 'PG', 'MA', 'XOM', 'CVX', 'LLY', 'ABBV', 'MRK',
  'COST', 'AVGO', 'PEP', 'KO', 'WMT', 'BAC', 'MCD', 'CSCO', 'TMO', 'ACN',
  'DIS', 'ABT', 'VZ', 'ADBE', 'CRM', 'NFLX', 'AMD', 'INTC', 'QCOM', 'TXN',
  'PM', 'NKE', 'CMCSA', 'NEE', 'RTX', 'UPS', 'ORCL', 'HON', 'LOW', 'SPGI',
]

// Top 30 crypto by market cap (CoinGecko IDs)
const CRYPTO_UNIVERSE = [
  'bitcoin', 'ethereum', 'tether', 'xrp', 'bnb', 'solana', 'usdc', 'cardano',
  'avalanche-2', 'dogecoin', 'polkadot', 'chainlink', 'tron', 'matic-network',
  'shiba-inu', 'litecoin', 'uniswap', 'cosmos', 'stellar', 'monero',
  'ethereum-classic', 'okb', 'bitcoin-cash', 'aptos', 'near', 'filecoin',
  'internet-computer', 'lido-dao', 'arbitrum', 'vechain',
]

type UniverseType = 'cached' | 'popular' | 'crypto_only' | 'stocks_only'

// ============ TYPES ============

type ScreenerOperator = 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'between'
type AssetType = 'stock' | 'crypto'

interface ScreenerRule {
  field: string
  operator: ScreenerOperator
  value: number | [number, number]
}

interface ScreenerRunRequest {
  rules: ScreenerRule[]
  logic: 'AND' | 'OR'
  assetTypes: AssetType[]
  limit?: number
  offset?: number
  universe?: UniverseType // 'cached' | 'popular' | 'crypto_only' | 'stocks_only'
}

interface ScreenerTestRequest {
  symbol: string
  assetType: AssetType
  rules: ScreenerRule[]
  logic: 'AND' | 'OR'
}

interface QuoteData {
  symbol: string
  assetType: AssetType
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

interface IndicatorData {
  rsi_14: number
  sma_20: number
  sma_50: number
  sma_200: number
  volume_ratio: number
}

interface ScreenerMatch {
  symbol: string
  assetType: AssetType
  price: number
  matchedValues: Record<string, number>
  matchedRules: number
}

// ============ PRESET SCREENERS ============

const PRESET_SCREENERS = [
  {
    id: 'preset-oversold',
    name: 'Oversold (RSI < 30)',
    description: 'Find assets that may be oversold based on RSI indicator',
    rules: [{ field: 'rsi_14', operator: 'lt' as const, value: 30 }],
    logic: 'AND' as const,
    assetTypes: ['stock', 'crypto'] as AssetType[],
    isPreset: true,
  },
  {
    id: 'preset-overbought',
    name: 'Overbought (RSI > 70)',
    description: 'Find assets that may be overbought based on RSI indicator',
    rules: [{ field: 'rsi_14', operator: 'gt' as const, value: 70 }],
    logic: 'AND' as const,
    assetTypes: ['stock', 'crypto'] as AssetType[],
    isPreset: true,
  },
  {
    id: 'preset-high-volume',
    name: 'High Volume Breakout',
    description: 'Assets with above-average volume and positive momentum',
    rules: [
      { field: 'volume_ratio', operator: 'gt' as const, value: 2.0 },
      { field: 'change_percent', operator: 'gt' as const, value: 3 }
    ],
    logic: 'AND' as const,
    assetTypes: ['stock', 'crypto'] as AssetType[],
    isPreset: true,
  },
  {
    id: 'preset-golden-cross',
    name: 'Golden Cross (SMA 50 > SMA 200)',
    description: 'Bullish signal where short-term trend crosses above long-term',
    rules: [{ field: 'sma_cross_50_200', operator: 'gt' as const, value: 0 }],
    logic: 'AND' as const,
    assetTypes: ['stock', 'crypto'] as AssetType[],
    isPreset: true,
  },
  {
    id: 'preset-bargain',
    name: 'Bargain Hunter',
    description: 'Oversold assets with high volume - potential reversal candidates',
    rules: [
      { field: 'rsi_14', operator: 'lt' as const, value: 35 },
      { field: 'volume_ratio', operator: 'gt' as const, value: 1.5 },
      { field: 'change_percent', operator: 'lt' as const, value: -2 }
    ],
    logic: 'AND' as const,
    assetTypes: ['stock', 'crypto'] as AssetType[],
    isPreset: true,
  },
  {
    id: 'preset-momentum',
    name: 'Momentum Play',
    description: 'Strong upward momentum with RSI confirmation',
    rules: [
      { field: 'rsi_14', operator: 'between' as const, value: [50, 70] as [number, number] },
      { field: 'change_percent', operator: 'gt' as const, value: 5 }
    ],
    logic: 'AND' as const,
    assetTypes: ['stock', 'crypto'] as AssetType[],
    isPreset: true,
  }
]

// ============ LIVE DATA FETCHING ============

interface BatchQuoteResult {
  symbol: string
  assetType: AssetType
  quote: QuoteData | null
  error?: string
}

async function fetchLiveQuotes(symbols: string[], assetType: AssetType): Promise<BatchQuoteResult[]> {
  const results: BatchQuoteResult[] = []
  
  // Process in batches of 10 (market-data-service limit)
  const batchSize = 10
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const symbolsParam = batch.join(',')
    
    try {
      const url = `${MARKET_DATA_SERVICE_URL}/batch?symbols=${encodeURIComponent(symbolsParam)}&type=${assetType}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        console.error(`Batch fetch failed: ${response.status}`)
        // Add error results for this batch
        for (const symbol of batch) {
          results.push({ symbol, assetType, quote: null, error: 'Batch fetch failed' })
        }
        continue
      }
      
      const data = await response.json()
      
      // Parse batch response
      for (const symbol of batch) {
        const key = symbol.toUpperCase()
        const result = data.data?.[key]
        
        if (result && !result.error) {
          results.push({
            symbol,
            assetType,
            quote: result as QuoteData,
          })
        } else {
          results.push({
            symbol,
            assetType,
            quote: null,
            error: result?.error || 'No data',
          })
        }
      }
    } catch (error) {
      console.error(`Error fetching batch:`, error)
      for (const symbol of batch) {
        results.push({ symbol, assetType, quote: null, error: 'Fetch error' })
      }
    }
    
    // Small delay between batches to be kind to rate limits
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  return results
}

async function fetchHistoryForSymbol(symbol: string, assetType: AssetType, days: number = 30): Promise<number[]> {
  try {
    const url = `${MARKET_DATA_SERVICE_URL}/history?symbol=${encodeURIComponent(symbol)}&type=${assetType}&days=${days}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    return data.data?.prices || []
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error)
    return []
  }
}

// ============ INDICATOR CALCULATIONS ============

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50 // Not enough data, return neutral
  
  let gains = 0
  let losses = 0
  
  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }
  
  let avgGain = gains / period
  let avgLoss = losses / period
  
  // Apply smoothing for remaining periods
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period
      avgLoss = (avgLoss * (period - 1)) / period
    } else {
      avgGain = (avgGain * (period - 1)) / period
      avgLoss = (avgLoss * (period - 1) - change) / period
    }
  }
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

async function fetchIndicatorsForSymbol(
  symbol: string, 
  assetType: AssetType
): Promise<{ quote: QuoteData | null; indicators: IndicatorData | null }> {
  try {
    // Fetch quote data from cache
    const { data: cacheData } = await supabase
      .from('market_data_cache')
      .select('data')
      .eq('symbol', assetType === 'stock' ? symbol.toUpperCase() : symbol.toLowerCase())
      .eq('asset_type', assetType)
      .single()
    
    if (!cacheData?.data) {
      return { quote: null, indicators: null }
    }
    
    const quote = cacheData.data as QuoteData
    
    // Fetch historical data for indicator calculations
    const { data: historyData } = await supabase
      .from('market_history_cache')
      .select('data')
      .eq('symbol', assetType === 'stock' ? symbol.toUpperCase() : symbol.toLowerCase())
      .eq('asset_type', assetType)
      .order('days', { ascending: false })
      .limit(1)
      .single()
    
    let prices: number[] = []
    if (historyData?.data?.prices) {
      prices = historyData.data.prices
    }
    
    // Calculate indicators
    const rsi_14 = prices.length > 14 ? calculateRSI(prices, 14) : 50
    const sma_20 = calculateSMA(prices, 20) || quote.price
    const sma_50 = calculateSMA(prices, 50) || quote.price * 0.98
    const sma_200 = calculateSMA(prices, 200) || quote.price * 0.95
    
    // Calculate volume ratio (current vs average)
    // For now, estimate based on 24h change - in production would use historical volume
    const volume_ratio = 1.0 + (Math.abs(quote.changePercent) / 10)
    
    return {
      quote,
      indicators: {
        rsi_14: parseFloat(rsi_14.toFixed(2)),
        sma_20: parseFloat(sma_20.toFixed(4)),
        sma_50: parseFloat(sma_50.toFixed(4)),
        sma_200: parseFloat(sma_200.toFixed(4)),
        volume_ratio: parseFloat(volume_ratio.toFixed(2)),
      }
    }
  } catch (error) {
    console.error(`Error fetching indicators for ${symbol}:`, error)
    return { quote: null, indicators: null }
  }
}

// ============ RULE EVALUATION ============

function evaluateRule(rule: ScreenerRule, value: number | null): boolean {
  if (value === null || value === undefined) return false
  
  switch (rule.operator) {
    case 'gt':
      return value > (rule.value as number)
    case 'lt':
      return value < (rule.value as number)
    case 'gte':
      return value >= (rule.value as number)
    case 'lte':
      return value <= (rule.value as number)
    case 'eq':
      return Math.abs(value - (rule.value as number)) < 0.0001
    case 'between':
      const [min, max] = rule.value as [number, number]
      return value >= min && value <= max
    default:
      return false
  }
}

function getFieldValue(
  field: string, 
  quote: QuoteData, 
  indicators: IndicatorData
): number | null {
  switch (field) {
    case 'price':
      return quote.price
    case 'change_percent':
      return quote.changePercent
    case 'volume':
      return quote.volume
    case 'high_24h':
      return quote.high
    case 'low_24h':
      return quote.low
    case 'rsi_14':
      return indicators.rsi_14
    case 'sma_20':
      return indicators.sma_20
    case 'sma_50':
      return indicators.sma_50
    case 'sma_200':
      return indicators.sma_200
    case 'volume_ratio':
      return indicators.volume_ratio
    case 'sma_cross_50_200':
      // Golden cross: SMA 50 - SMA 200 (positive = bullish)
      return indicators.sma_50 - indicators.sma_200
    default:
      console.warn(`Unknown field: ${field}`)
      return null
  }
}

function evaluateAllRules(
  rules: ScreenerRule[],
  logic: 'AND' | 'OR',
  quote: QuoteData,
  indicators: IndicatorData
): { matches: boolean; matchedValues: Record<string, number>; matchedRules: number } {
  const matchedValues: Record<string, number> = {}
  let matchedRules = 0
  const results: boolean[] = []
  
  for (const rule of rules) {
    const value = getFieldValue(rule.field, quote, indicators)
    const passed = evaluateRule(rule, value)
    
    if (value !== null) {
      matchedValues[rule.field] = value
    }
    
    if (passed) {
      matchedRules++
    }
    
    results.push(passed)
  }
  
  const matches = logic === 'AND' 
    ? results.every(r => r) 
    : results.some(r => r)
  
  return { matches, matchedValues, matchedRules }
}

// ============ HANDLERS ============

async function handleRun(body: ScreenerRunRequest): Promise<Response> {
  const startTime = Date.now()
  const { rules, logic, assetTypes, limit = 50, offset = 0, universe = 'cached' } = body
  
  if (!rules || rules.length === 0) {
    return new Response(JSON.stringify({ error: 'At least one rule is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  if (!assetTypes || assetTypes.length === 0) {
    return new Response(JSON.stringify({ error: 'At least one asset type is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const matches: ScreenerMatch[] = []
  let totalScanned = 0
  let dataSource = 'cache'
  
  if (universe === 'cached') {
    // Original behavior: only cached data
    const { data: cachedSymbols, error } = await supabase
      .from('market_data_cache')
      .select('symbol, asset_type, data')
      .in('asset_type', assetTypes)
    
    if (error) {
      console.error('Error fetching cached symbols:', error)
      return new Response(JSON.stringify({ error: 'Failed to fetch market data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    for (const cached of cachedSymbols || []) {
      totalScanned++
      
      const { quote, indicators } = await fetchIndicatorsForSymbol(
        cached.symbol, 
        cached.asset_type as AssetType
      )
      
      if (!quote || !indicators) continue
      
      const result = evaluateAllRules(rules, logic, quote, indicators)
      
      if (result.matches) {
        matches.push({
          symbol: quote.symbol,
          assetType: cached.asset_type as AssetType,
          price: quote.price,
          matchedValues: result.matchedValues,
          matchedRules: result.matchedRules,
        })
      }
    }
  } else {
    // Live universe screening
    dataSource = universe
    
    // Determine which symbols to screen based on universe and assetTypes
    const cryptoSymbols = (universe === 'popular' || universe === 'crypto_only') && assetTypes.includes('crypto')
      ? CRYPTO_UNIVERSE
      : []
    
    const stockSymbols = (universe === 'popular' || universe === 'stocks_only') && assetTypes.includes('stock')
      ? STOCK_UNIVERSE
      : []
    
    // Fetch crypto first (CoinGecko is faster and more generous with rate limits)
    if (cryptoSymbols.length > 0) {
      console.log(`Screening ${cryptoSymbols.length} crypto symbols...`)
      const cryptoQuotes = await fetchLiveQuotes(cryptoSymbols, 'crypto')
      
      for (const { symbol, quote, error } of cryptoQuotes) {
        if (error || !quote) {
          console.log(`Skipping ${symbol}: ${error || 'no quote'}`)
          continue
        }
        
        totalScanned++
        
        // Calculate indicators from quote data (simplified)
        // For more accurate RSI, we'd need to fetch history
        const indicators = calculateIndicatorsFromQuote(quote)
        
        const result = evaluateAllRules(rules, logic, quote, indicators)
        
        if (result.matches) {
          matches.push({
            symbol: quote.symbol,
            assetType: 'crypto',
            price: quote.price,
            matchedValues: result.matchedValues,
            matchedRules: result.matchedRules,
          })
        }
      }
    }
    
    // Then stocks (Polygon has 5 calls/min rate limit)
    if (stockSymbols.length > 0) {
      console.log(`Screening ${stockSymbols.length} stock symbols...`)
      const stockQuotes = await fetchLiveQuotes(stockSymbols, 'stock')
      
      for (const { symbol, quote, error } of stockQuotes) {
        if (error || !quote) {
          console.log(`Skipping ${symbol}: ${error || 'no quote'}`)
          continue
        }
        
        totalScanned++
        
        const indicators = calculateIndicatorsFromQuote(quote)
        
        const result = evaluateAllRules(rules, logic, quote, indicators)
        
        if (result.matches) {
          matches.push({
            symbol: quote.symbol,
            assetType: 'stock',
            price: quote.price,
            matchedValues: result.matchedValues,
            matchedRules: result.matchedRules,
          })
        }
      }
    }
  }
  
  // Sort by matched rules (most matches first) and apply pagination
  matches.sort((a, b) => b.matchedRules - a.matchedRules)
  const paginatedMatches = matches.slice(offset, offset + limit)
  
  const executionTimeMs = Date.now() - startTime
  
  return new Response(JSON.stringify({
    matches: paginatedMatches,
    totalScanned,
    totalMatched: matches.length,
    executedAt: new Date().toISOString(),
    executionTimeMs,
    dataSource,
    pagination: {
      limit,
      offset,
      hasMore: offset + limit < matches.length,
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Calculate indicators from a quote without historical data
// Uses approximations based on 24h change
function calculateIndicatorsFromQuote(quote: QuoteData): IndicatorData {
  const price = quote.price
  const change = quote.changePercent
  
  // Approximate RSI from recent price movement
  // RSI of 50 is neutral; adjust based on 24h change
  let rsi = 50 + (change * 2)
  rsi = Math.max(0, Math.min(100, rsi))
  
  // Approximate SMAs (in reality would need historical data)
  const sma_20 = price * (1 - change / 100 * 0.1) // Slightly offset
  const sma_50 = price * (1 - change / 100 * 0.2)
  const sma_200 = price * (1 - change / 100 * 0.3)
  
  // Volume ratio estimated from price volatility
  const volume_ratio = 1.0 + (Math.abs(change) / 10)
  
  return {
    rsi_14: parseFloat(rsi.toFixed(2)),
    sma_20: parseFloat(sma_20.toFixed(4)),
    sma_50: parseFloat(sma_50.toFixed(4)),
    sma_200: parseFloat(sma_200.toFixed(4)),
    volume_ratio: parseFloat(volume_ratio.toFixed(2)),
  }
}

async function handleTest(body: ScreenerTestRequest): Promise<Response> {
  const { symbol, assetType, rules, logic } = body
  
  if (!symbol || !assetType) {
    return new Response(JSON.stringify({ error: 'Symbol and assetType are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  if (!rules || rules.length === 0) {
    return new Response(JSON.stringify({ error: 'At least one rule is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const { quote, indicators } = await fetchIndicatorsForSymbol(symbol, assetType)
  
  if (!quote || !indicators) {
    return new Response(JSON.stringify({ 
      error: `No data found for ${symbol}. Make sure it exists in the market data cache.` 
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Evaluate each rule individually for detailed results
  const ruleResults = rules.map(rule => {
    const actualValue = getFieldValue(rule.field, quote, indicators)
    const passed = evaluateRule(rule, actualValue)
    return { rule, actualValue, passed }
  })
  
  // Overall match based on logic
  const matches = logic === 'AND'
    ? ruleResults.every(r => r.passed)
    : ruleResults.some(r => r.passed)
  
  // Collect all evaluated values
  const evaluatedValues: Record<string, number> = {}
  for (const result of ruleResults) {
    if (result.actualValue !== null) {
      evaluatedValues[result.rule.field] = result.actualValue
    }
  }
  
  return new Response(JSON.stringify({
    symbol: quote.symbol,
    assetType,
    price: quote.price,
    matches,
    evaluatedValues,
    ruleResults,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function handlePresets(): Response {
  // Also fetch user-saved presets from database
  return new Response(JSON.stringify({
    presets: PRESET_SCREENERS,
    count: PRESET_SCREENERS.length,
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
  const path = url.pathname.replace('/screener-engine', '').replace(/^\/+/, '')
  
  try {
    switch (path) {
      case 'run':
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        const runBody = await req.json()
        return await handleRun(runBody as ScreenerRunRequest)
      
      case 'test':
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        const testBody = await req.json()
        return await handleTest(testBody as ScreenerTestRequest)
      
      case 'presets':
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return handlePresets()
      
      default:
        return new Response(JSON.stringify({
          service: 'screener-engine',
          version: '1.1.0',
          endpoints: [
            'POST /run - Execute screener against securities (cached or live universe)',
            'POST /test - Test screener against a single symbol',
            'GET /presets - Return preset screener profiles',
          ],
          example: {
            run_cached: {
              rules: [
                { field: 'rsi_14', operator: 'lt', value: 30 },
                { field: 'volume_ratio', operator: 'gt', value: 1.5 }
              ],
              logic: 'AND',
              assetTypes: ['crypto'],
              limit: 50,
              universe: 'cached'
            },
            run_popular: {
              rules: [{ field: 'rsi_14', operator: 'lt', value: 30 }],
              logic: 'AND',
              assetTypes: ['crypto'],
              universe: 'popular'
            },
            run_crypto_only: {
              rules: [{ field: 'change_percent', operator: 'lt', value: -5 }],
              logic: 'AND',
              assetTypes: ['crypto'],
              universe: 'crypto_only'
            },
            test: {
              symbol: 'bitcoin',
              assetType: 'crypto',
              rules: [{ field: 'rsi_14', operator: 'lt', value: 30 }],
              logic: 'AND'
            }
          },
          universeOptions: {
            cached: 'Only screen cached data (fastest)',
            popular: 'Top 50 stocks + top 30 crypto (live fetch)',
            crypto_only: 'Top 30 crypto only (fast, no Polygon rate limits)',
            stocks_only: 'Top 50 stocks only (slower due to Polygon rate limits)',
          },
          availableFields: [
            'price', 'change_percent', 'volume', 'high_24h', 'low_24h',
            'rsi_14', 'sma_20', 'sma_50', 'sma_200', 'volume_ratio',
            'sma_cross_50_200 (for golden cross detection)'
          ],
          operators: ['gt', 'lt', 'gte', 'lte', 'eq', 'between'],
          stockUniverse: STOCK_UNIVERSE.slice(0, 10).join(', ') + '... (50 total)',
          cryptoUniverse: CRYPTO_UNIVERSE.slice(0, 10).join(', ') + '... (30 total)',
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
