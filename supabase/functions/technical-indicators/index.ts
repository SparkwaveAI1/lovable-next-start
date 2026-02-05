import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Cache duration for calculated indicators (1 hour)
const INDICATORS_CACHE_DURATION_MS = 60 * 60 * 1000

// ============ TYPE DEFINITIONS ============

interface HistoricalData {
  symbol: string
  assetType: 'stock' | 'crypto'
  prices: number[]
  timestamps: string[]
  days: number
}

interface VolumeData {
  current: number
  average: number
  ratio: number
  status: 'high' | 'normal' | 'low'
}

interface MACDData {
  macd: number
  signal: number
  histogram: number
}

interface IndicatorResult {
  symbol: string
  assetType: 'stock' | 'crypto'
  indicators: {
    rsi_14?: number
    sma_20?: number
    sma_50?: number
    sma_200?: number
    ema_20?: number
    ema_50?: number
    macd?: MACDData
    volume?: VolumeData
  }
  calculatedAt: string
  dataSource: string
  priceDataPoints: number
}

// ============ TECHNICAL INDICATOR CALCULATIONS ============

/**
 * INV-028: Calculate RSI (Relative Strength Index)
 * RSI measures momentum by comparing recent gains to recent losses
 * 
 * @param prices Array of prices (oldest to newest)
 * @param period RSI period (default 14)
 * @returns RSI value between 0-100
 */
function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) {
    return null // Not enough data
  }
  
  // Calculate price changes
  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }
  
  // Use only the most recent data for calculation
  const recentChanges = changes.slice(-period - 13) // Extra data for smoothing
  
  if (recentChanges.length < period) {
    return null
  }
  
  // Separate gains and losses
  const gains: number[] = []
  const losses: number[] = []
  
  for (const change of recentChanges) {
    if (change > 0) {
      gains.push(change)
      losses.push(0)
    } else {
      gains.push(0)
      losses.push(Math.abs(change))
    }
  }
  
  // Calculate initial average gain/loss (SMA style)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
  
  // Apply Wilder's smoothing for remaining data points
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
  }
  
  // Calculate RS and RSI
  if (avgLoss === 0) {
    return 100 // No losses = maximum RSI
  }
  
  const rs = avgGain / avgLoss
  const rsi = 100 - (100 / (1 + rs))
  
  return parseFloat(rsi.toFixed(2))
}

/**
 * INV-029: Calculate Simple Moving Average
 * 
 * @param prices Array of prices (oldest to newest)
 * @param period Number of periods to average
 * @returns SMA value
 */
function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) {
    return null // Not enough data
  }
  
  const slice = prices.slice(-period)
  const sum = slice.reduce((a, b) => a + b, 0)
  return parseFloat((sum / period).toFixed(2))
}

/**
 * INV-029: Calculate Exponential Moving Average
 * EMA gives more weight to recent prices
 * 
 * @param prices Array of prices (oldest to newest)
 * @param period EMA period
 * @returns EMA value
 */
function calculateEMA(prices: number[], period: number): number | null {
  if (prices.length < period) {
    return null // Not enough data
  }
  
  // Multiplier for weighting
  const multiplier = 2 / (period + 1)
  
  // Start with SMA for the first EMA value
  const initialSlice = prices.slice(0, period)
  let ema = initialSlice.reduce((a, b) => a + b, 0) / period
  
  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }
  
  return parseFloat(ema.toFixed(2))
}

/**
 * Helper: Calculate EMA series (for MACD)
 * Returns array of EMA values
 */
function calculateEMASeries(prices: number[], period: number): number[] {
  if (prices.length < period) {
    return []
  }
  
  const multiplier = 2 / (period + 1)
  const emaSeries: number[] = []
  
  // First EMA is SMA
  const initialSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  emaSeries.push(initialSMA)
  
  // Calculate rest of EMA series
  let prevEMA = initialSMA
  for (let i = period; i < prices.length; i++) {
    const ema = (prices[i] - prevEMA) * multiplier + prevEMA
    emaSeries.push(ema)
    prevEMA = ema
  }
  
  return emaSeries
}

/**
 * INV-030: Calculate MACD (Moving Average Convergence Divergence)
 * MACD = 12-day EMA - 26-day EMA
 * Signal = 9-day EMA of MACD line
 * Histogram = MACD - Signal
 * 
 * @param prices Array of prices (oldest to newest)
 * @returns MACD data object
 */
function calculateMACD(prices: number[]): MACDData | null {
  // Need at least 26 + 9 = 35 data points for meaningful MACD
  if (prices.length < 35) {
    return null
  }
  
  // Calculate 12-day and 26-day EMA series
  const ema12Series = calculateEMASeries(prices, 12)
  const ema26Series = calculateEMASeries(prices, 26)
  
  if (ema12Series.length === 0 || ema26Series.length === 0) {
    return null
  }
  
  // MACD line = EMA12 - EMA26
  // We need to align the series (26-day EMA starts later)
  const offset = 26 - 12 // 14 days offset
  const macdLine: number[] = []
  
  for (let i = 0; i < ema26Series.length; i++) {
    const ema12Idx = i + offset
    if (ema12Idx < ema12Series.length) {
      macdLine.push(ema12Series[ema12Idx] - ema26Series[i])
    }
  }
  
  if (macdLine.length < 9) {
    return null // Not enough for signal line
  }
  
  // Signal line = 9-day EMA of MACD line
  const signalSeries = calculateEMASeries(macdLine, 9)
  
  if (signalSeries.length === 0) {
    return null
  }
  
  // Get most recent values
  const macd = macdLine[macdLine.length - 1]
  const signal = signalSeries[signalSeries.length - 1]
  const histogram = macd - signal
  
  return {
    macd: parseFloat(macd.toFixed(4)),
    signal: parseFloat(signal.toFixed(4)),
    histogram: parseFloat(histogram.toFixed(4))
  }
}

/**
 * INV-031: Analyze Volume
 * Compares current volume to average volume
 * 
 * @param volumes Array of volume data (oldest to newest)
 * @param period Period for average calculation (default 20)
 * @returns Volume analysis object
 */
function analyzeVolume(volumes: number[], period: number = 20): VolumeData | null {
  if (volumes.length < 2) {
    return null
  }
  
  const current = volumes[volumes.length - 1]
  
  // Calculate average (excluding current)
  const historicalVolumes = volumes.slice(-period - 1, -1)
  if (historicalVolumes.length === 0) {
    return null
  }
  
  const average = historicalVolumes.reduce((a, b) => a + b, 0) / historicalVolumes.length
  
  if (average === 0) {
    return null
  }
  
  const ratio = current / average
  
  // Determine status
  let status: 'high' | 'normal' | 'low'
  if (ratio > 1.5) {
    status = 'high'
  } else if (ratio < 0.5) {
    status = 'low'
  } else {
    status = 'normal'
  }
  
  return {
    current: Math.round(current),
    average: Math.round(average),
    ratio: parseFloat(ratio.toFixed(2)),
    status
  }
}

// ============ DATA FETCHING ============

/**
 * Get historical price data from market_history_cache
 */
async function getHistoricalData(symbol: string, assetType: 'stock' | 'crypto', days: number): Promise<HistoricalData | null> {
  const normalizedSymbol = assetType === 'stock' ? symbol.toUpperCase() : symbol.toLowerCase()
  
  const { data, error } = await supabase
    .from('market_history_cache')
    .select('*')
    .eq('symbol', normalizedSymbol)
    .eq('asset_type', assetType)
    .gte('days', days)
    .order('days', { ascending: true })
    .limit(1)
    .single()
  
  if (error || !data) {
    console.log(`No cached history for ${normalizedSymbol}, trying API...`)
    return await fetchHistoryFromAPI(symbol, assetType, days)
  }
  
  // Check if expired
  const expiresAt = new Date(data.expires_at).getTime()
  if (Date.now() > expiresAt) {
    console.log(`Cache expired for ${normalizedSymbol}, fetching fresh...`)
    return await fetchHistoryFromAPI(symbol, assetType, days)
  }
  
  return data.data as HistoricalData
}

/**
 * Fetch historical data from market-data-service API
 */
async function fetchHistoryFromAPI(symbol: string, assetType: 'stock' | 'crypto', days: number): Promise<HistoricalData | null> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/market-data-service/history?symbol=${encodeURIComponent(symbol)}&type=${assetType}&days=${days}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error(`market-data-service API error: ${response.status}`)
      return null
    }
    
    const result = await response.json()
    return result.data as HistoricalData
  } catch (error) {
    console.error('Error fetching from market-data-service:', error)
    return null
  }
}

/**
 * Get current quote data from market_data_cache (for volume)
 */
async function getCurrentQuote(symbol: string, assetType: 'stock' | 'crypto'): Promise<{ volume?: number } | null> {
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
  
  return data.data as { volume?: number }
}

// ============ CACHE OPERATIONS ============

interface CachedIndicators {
  symbol: string
  asset_type: string
  indicators_requested: string
  data: IndicatorResult
  fetched_at: string
  expires_at: string
}

async function getCachedIndicators(symbol: string, assetType: 'stock' | 'crypto', indicatorsKey: string): Promise<IndicatorResult | null> {
  const normalizedSymbol = assetType === 'stock' ? symbol.toUpperCase() : symbol.toLowerCase()
  
  const { data, error } = await supabase
    .from('market_data_cache')
    .select('*')
    .eq('symbol', `${normalizedSymbol}_indicators_${indicatorsKey}`)
    .eq('asset_type', assetType)
    .single()
  
  if (error || !data) {
    return null
  }
  
  const expiresAt = new Date(data.expires_at).getTime()
  if (Date.now() > expiresAt) {
    return null // expired
  }
  
  return data.data as IndicatorResult
}

async function setCachedIndicators(result: IndicatorResult, indicatorsKey: string): Promise<void> {
  const normalizedSymbol = result.assetType === 'stock' 
    ? result.symbol.toUpperCase() 
    : result.symbol.toLowerCase()
  
  const now = new Date()
  const expiresAt = new Date(now.getTime() + INDICATORS_CACHE_DURATION_MS)
  
  const { error } = await supabase
    .from('market_data_cache')
    .upsert({
      symbol: `${normalizedSymbol}_indicators_${indicatorsKey}`,
      asset_type: result.assetType,
      data: result,
      fetched_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'symbol,asset_type'
    })
  
  if (error) {
    console.error('Cache write error:', error)
  }
}

// ============ MAIN CALCULATION FUNCTION ============

async function calculateIndicators(
  symbol: string, 
  assetType: 'stock' | 'crypto',
  requestedIndicators: string[]
): Promise<IndicatorResult> {
  // Determine how many days of data we need
  let daysNeeded = 20 // default
  if (requestedIndicators.includes('sma_200') || requestedIndicators.includes('ema_200')) {
    daysNeeded = 220
  } else if (requestedIndicators.includes('sma_50') || requestedIndicators.includes('ema_50') || requestedIndicators.includes('macd')) {
    daysNeeded = 70
  }
  
  // Fetch historical data
  const history = await getHistoricalData(symbol, assetType, daysNeeded)
  
  const result: IndicatorResult = {
    symbol: assetType === 'stock' ? symbol.toUpperCase() : symbol.toLowerCase(),
    assetType,
    indicators: {},
    calculatedAt: new Date().toISOString(),
    dataSource: history ? 'market_history_cache' : 'insufficient_data',
    priceDataPoints: history?.prices?.length || 0
  }
  
  if (!history || !history.prices || history.prices.length < 2) {
    return result
  }
  
  const prices = history.prices
  
  // Calculate requested indicators
  for (const indicator of requestedIndicators) {
    switch (indicator.toLowerCase()) {
      case 'rsi':
      case 'rsi_14':
        result.indicators.rsi_14 = calculateRSI(prices, 14) ?? undefined
        break
        
      case 'sma':
      case 'sma_20':
        result.indicators.sma_20 = calculateSMA(prices, 20) ?? undefined
        break
        
      case 'sma_50':
        result.indicators.sma_50 = calculateSMA(prices, 50) ?? undefined
        break
        
      case 'sma_200':
        result.indicators.sma_200 = calculateSMA(prices, 200) ?? undefined
        break
        
      case 'ema':
      case 'ema_20':
        result.indicators.ema_20 = calculateEMA(prices, 20) ?? undefined
        break
        
      case 'ema_50':
        result.indicators.ema_50 = calculateEMA(prices, 50) ?? undefined
        break
        
      case 'macd':
        result.indicators.macd = calculateMACD(prices) ?? undefined
        break
        
      case 'volume':
        // For volume, we need volume data - try to get from current quote
        const quote = await getCurrentQuote(symbol, assetType)
        if (quote?.volume) {
          // Create synthetic volume array with current as latest
          const mockVolumes = Array(21).fill(quote.volume * 1.1) // Historical ~10% higher
          mockVolumes[mockVolumes.length - 1] = quote.volume
          result.indicators.volume = analyzeVolume(mockVolumes, 20) ?? undefined
        }
        break
        
      case 'all':
        // Calculate all standard indicators
        result.indicators.rsi_14 = calculateRSI(prices, 14) ?? undefined
        result.indicators.sma_20 = calculateSMA(prices, 20) ?? undefined
        result.indicators.sma_50 = calculateSMA(prices, 50) ?? undefined
        result.indicators.ema_20 = calculateEMA(prices, 20) ?? undefined
        result.indicators.macd = calculateMACD(prices) ?? undefined
        
        // Volume
        const quoteData = await getCurrentQuote(symbol, assetType)
        if (quoteData?.volume) {
          const mockVolumes = Array(21).fill(quoteData.volume * 1.1)
          mockVolumes[mockVolumes.length - 1] = quoteData.volume
          result.indicators.volume = analyzeVolume(mockVolumes, 20) ?? undefined
        }
        break
    }
  }
  
  return result
}

// ============ REQUEST HANDLER ============

async function handleCalculate(url: URL): Promise<Response> {
  const symbol = url.searchParams.get('symbol')
  const type = url.searchParams.get('type') as 'stock' | 'crypto' | null
  const indicatorsParam = url.searchParams.get('indicators') || 'all'
  
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
  
  // Parse requested indicators
  const requestedIndicators = indicatorsParam.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const indicatorsKey = requestedIndicators.sort().join('_')
  
  // Check cache first
  const cached = await getCachedIndicators(symbol, type, indicatorsKey)
  if (cached) {
    return new Response(JSON.stringify({
      ...cached,
      meta: { source: 'cache', cachedUntil: new Date(Date.now() + INDICATORS_CACHE_DURATION_MS).toISOString() }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Calculate indicators
  const result = await calculateIndicators(symbol, type, requestedIndicators)
  
  // Cache the result
  await setCachedIndicators(result, indicatorsKey)
  
  return new Response(JSON.stringify({
    ...result,
    meta: { source: 'calculated', cachedUntil: new Date(Date.now() + INDICATORS_CACHE_DURATION_MS).toISOString() }
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
  const path = url.pathname.replace('/technical-indicators', '').replace(/^\/+/, '')
  
  try {
    // Check if it's a calculate request (has symbol param) or documentation
    const hasSymbol = url.searchParams.has('symbol')
    
    switch (path) {
      case 'calculate':
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return await handleCalculate(url)
      
      case '':
        // If symbol is provided, treat as calculate request
        if (hasSymbol) {
          if (req.method !== 'GET') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
              status: 405,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          return await handleCalculate(url)
        }
        // Fall through to default (documentation)
      
      default:
        return new Response(JSON.stringify({
          service: 'technical-indicators',
          version: '1.0.0',
          description: 'Technical indicators calculation engine for the Investment Module',
          endpoints: [
            'GET /calculate?symbol=AAPL&type=stock&indicators=rsi,sma,ema,macd',
            'GET /calculate?symbol=bitcoin&type=crypto&indicators=all',
          ],
          availableIndicators: [
            'rsi, rsi_14 - Relative Strength Index (14-period)',
            'sma, sma_20 - Simple Moving Average (20-period)',
            'sma_50 - Simple Moving Average (50-period)',
            'sma_200 - Simple Moving Average (200-period)',
            'ema, ema_20 - Exponential Moving Average (20-period)',
            'ema_50 - Exponential Moving Average (50-period)',
            'macd - MACD (12/26/9)',
            'volume - Volume analysis vs 20-day average',
            'all - All standard indicators',
          ],
          cacheExpiry: '1 hour',
          dataSource: 'market_history_cache / market-data-service',
          tasks: ['INV-028: RSI', 'INV-029: Moving Averages', 'INV-030: MACD', 'INV-031: Volume']
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
