// DISABLED: Investment functionality turned into static mockup
// Original functionality backed up to market-data-service.backup

import { corsHeaders } from '../_shared/cors.ts'

const STATIC_MOCKUP_MESSAGE = 'Investment functionality disabled - showing static mockup data only'

// Static mock data for UI demonstration
const MOCK_QUOTES = {
  'AAPL': {
    symbol: 'AAPL',
    assetType: 'stock' as const,
    price: 191.45,
    change: 2.34,
    changePercent: 1.24,
    volume: 45678901,
    high: 192.50,
    low: 189.20,
    open: 190.10,
    previousClose: 189.11,
    timestamp: new Date().toISOString()
  },
  'TSLA': {
    symbol: 'TSLA',
    assetType: 'stock' as const,
    price: 248.87,
    change: -3.12,
    changePercent: -1.24,
    volume: 23456789,
    high: 252.30,
    low: 247.50,
    open: 251.20,
    previousClose: 251.99,
    timestamp: new Date().toISOString()
  },
  'NVDA': {
    symbol: 'NVDA',
    assetType: 'stock' as const,
    price: 875.60,
    change: 12.45,
    changePercent: 1.44,
    volume: 34567890,
    high: 880.20,
    low: 870.10,
    open: 872.30,
    previousClose: 863.15,
    timestamp: new Date().toISOString()
  },
  'BTC': {
    symbol: 'BTC',
    assetType: 'crypto' as const,
    price: 51234.56,
    change: 1234.50,
    changePercent: 2.47,
    volume: 1234567890,
    high: 51500.00,
    low: 50800.00,
    open: 50950.25,
    previousClose: 50000.06,
    timestamp: new Date().toISOString()
  },
  'ETH': {
    symbol: 'ETH',
    assetType: 'crypto' as const,
    price: 3456.78,
    change: -45.60,
    changePercent: -1.30,
    volume: 987654321,
    high: 3520.00,
    low: 3440.50,
    open: 3480.20,
    previousClose: 3502.38,
    timestamp: new Date().toISOString()
  }
}

const MOCK_HISTORICAL = Array.from({ length: 30 }, (_, i) => ({
  time: new Date(Date.now() - (29-i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  open: 190 + Math.random() * 20,
  high: 195 + Math.random() * 20,
  low: 185 + Math.random() * 20,
  close: 190 + Math.random() * 20,
  volume: Math.floor(Math.random() * 50000000)
}))

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    console.log(`[DISABLED] Market data service called: ${path} - ${STATIC_MOCKUP_MESSAGE}`)

    switch (path) {
      case 'quote': {
        const symbols = url.searchParams.getAll('symbol')
        const quotes = symbols.length > 0 
          ? symbols.map(s => MOCK_QUOTES[s.toUpperCase()] || MOCK_QUOTES['AAPL'])
          : Object.values(MOCK_QUOTES)
        
        return new Response(
          JSON.stringify({ 
            data: quotes,
            message: STATIC_MOCKUP_MESSAGE 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      case 'historical': {
        const symbol = url.searchParams.get('symbol') || 'AAPL'
        
        return new Response(
          JSON.stringify({ 
            symbol,
            assetType: 'stock',
            ohlcv: MOCK_HISTORICAL,
            message: STATIC_MOCKUP_MESSAGE 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      case 'search': {
        const query = url.searchParams.get('q') || ''
        const mockResults = Object.keys(MOCK_QUOTES)
          .filter(symbol => symbol.includes(query.toUpperCase()))
          .slice(0, 10)
          .map(symbol => ({
            symbol,
            name: symbol === 'BTC' ? 'Bitcoin' : 
                  symbol === 'ETH' ? 'Ethereum' :
                  `${symbol} Inc.`,
            type: MOCK_QUOTES[symbol as keyof typeof MOCK_QUOTES].assetType
          }))

        return new Response(
          JSON.stringify({ 
            results: mockResults,
            message: STATIC_MOCKUP_MESSAGE 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Investment functionality disabled',
            message: STATIC_MOCKUP_MESSAGE,
            availableEndpoints: ['quote', 'historical', 'search']
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
    }
  } catch (error) {
    console.error('Mock market data service error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Investment functionality disabled',
        message: STATIC_MOCKUP_MESSAGE
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }
})