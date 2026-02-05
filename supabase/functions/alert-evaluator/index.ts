/**
 * Alert Evaluator Edge Function
 * INV-056 to INV-060: Workflow Integration & Notifications
 * 
 * Evaluates investment alerts against current market data and triggers:
 * - In-app notifications
 * - Email notifications
 * - Workflow executions (if configured)
 * 
 * Endpoints:
 * - POST /evaluate - Evaluate all active alerts
 * - POST /evaluate-single - Evaluate a specific alert
 * - POST /test - Test an alert condition without triggering
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============ TYPES ============

interface Alert {
  id: string
  user_id: string
  business_id: string | null
  name: string | null
  symbol: string
  asset_type: 'stock' | 'crypto'
  condition_json: AlertCondition
  notification_config: NotificationConfig | null
  workflow_id: string | null
  is_active: boolean
  cooldown_minutes: number
  last_triggered_at: string | null
  created_at: string
}

interface AlertCondition {
  indicator: string  // 'price', 'rsi_14', 'sma_20', 'change_percent', etc.
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'crosses_above' | 'crosses_below'
  value: number
}

interface NotificationConfig {
  email?: boolean
  inApp?: boolean
  push?: boolean
}

// INV-057: Alert Workflow Payload Schema
interface AlertWorkflowPayload {
  alertId: string
  alertName: string
  symbol: string
  assetType: 'stock' | 'crypto'
  indicator: string
  operator: string
  threshold: number
  actualValue: number
  priceAtTrigger: number
  triggeredAt: string
  formatted: {
    summary: string
    symbol: string
    price: string
  }
}

interface MarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
}

interface IndicatorData {
  rsi_14?: number
  sma_20?: number
  sma_50?: number
  sma_200?: number
  ema_20?: number
  ema_50?: number
  volume_ratio?: number
}

interface EvaluationResult {
  alertId: string
  alertName: string | null
  symbol: string
  triggered: boolean
  actualValue: number | null
  threshold: number
  indicator: string
  operator: string
  notificationsSent: string[]
  workflowTriggered: boolean
  error?: string
}

// ============ MARKET DATA FETCHING ============

async function getMarketData(symbol: string, assetType: 'stock' | 'crypto'): Promise<MarketData | null> {
  const normalizedSymbol = assetType === 'stock' ? symbol.toUpperCase() : symbol.toLowerCase()
  
  const { data, error } = await supabase
    .from('market_data_cache')
    .select('data')
    .eq('symbol', normalizedSymbol)
    .eq('asset_type', assetType)
    .single()
  
  if (error || !data) {
    console.error(`No market data for ${normalizedSymbol}:`, error?.message)
    return null
  }
  
  return data.data as MarketData
}

async function getIndicators(symbol: string, assetType: 'stock' | 'crypto'): Promise<IndicatorData | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/technical-indicators?symbol=${encodeURIComponent(symbol)}&type=${assetType}&indicators=all`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      console.error(`Indicators API error: ${response.status}`)
      return null
    }
    
    const result = await response.json()
    return result.indicators as IndicatorData
  } catch (error) {
    console.error(`Error fetching indicators for ${symbol}:`, error)
    return null
  }
}

// ============ CONDITION EVALUATION ============

function getIndicatorValue(
  indicator: string,
  marketData: MarketData,
  indicators: IndicatorData | null
): number | null {
  switch (indicator.toLowerCase()) {
    case 'price':
      return marketData.price
    case 'change_percent':
      return marketData.changePercent
    case 'volume':
      return marketData.volume
    case 'high_24h':
      return marketData.high
    case 'low_24h':
      return marketData.low
    case 'rsi':
    case 'rsi_14':
      return indicators?.rsi_14 ?? null
    case 'sma_20':
      return indicators?.sma_20 ?? null
    case 'sma_50':
      return indicators?.sma_50 ?? null
    case 'sma_200':
      return indicators?.sma_200 ?? null
    case 'ema_20':
      return indicators?.ema_20 ?? null
    case 'ema_50':
      return indicators?.ema_50 ?? null
    case 'volume_ratio':
      return indicators?.volume_ratio ?? null
    default:
      console.warn(`Unknown indicator: ${indicator}`)
      return null
  }
}

function evaluateCondition(
  actualValue: number | null,
  operator: string,
  threshold: number
): boolean {
  if (actualValue === null) return false
  
  switch (operator) {
    case 'gt':
      return actualValue > threshold
    case 'lt':
      return actualValue < threshold
    case 'gte':
      return actualValue >= threshold
    case 'lte':
      return actualValue <= threshold
    case 'eq':
      return Math.abs(actualValue - threshold) < 0.0001
    case 'crosses_above':
    case 'crosses_below':
      // For crosses, we'd need historical data - for now treat as gt/lt
      return operator === 'crosses_above' ? actualValue > threshold : actualValue < threshold
    default:
      console.warn(`Unknown operator: ${operator}`)
      return false
  }
}

function isInCooldown(lastTriggered: string | null, cooldownMinutes: number): boolean {
  if (!lastTriggered) return false
  
  const lastTime = new Date(lastTriggered).getTime()
  const now = Date.now()
  const cooldownMs = cooldownMinutes * 60 * 1000
  
  return (now - lastTime) < cooldownMs
}

// ============ NOTIFICATION HELPERS ============

function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `$${price.toFixed(6)}`
}

function formatIndicatorValue(indicator: string, value: number): string {
  if (indicator.includes('price') || indicator.includes('sma') || indicator.includes('ema')) {
    return formatPrice(value)
  }
  if (indicator.includes('percent') || indicator.includes('rsi')) {
    return value.toFixed(2)
  }
  if (indicator.includes('volume')) {
    return value.toLocaleString('en-US')
  }
  return value.toString()
}

function getOperatorText(operator: string): string {
  const operatorMap: Record<string, string> = {
    'gt': 'above',
    'lt': 'below',
    'gte': 'at or above',
    'lte': 'at or below',
    'eq': 'equals',
    'crosses_above': 'crossed above',
    'crosses_below': 'crossed below'
  }
  return operatorMap[operator] || operator
}

function formatAlertSummary(alert: Alert, actualValue: number, price: number): string {
  const { condition_json } = alert
  const indicator = condition_json.indicator.replace('_', ' ').toUpperCase()
  const operatorText = getOperatorText(condition_json.operator)
  
  if (condition_json.indicator === 'price') {
    return `${alert.symbol.toUpperCase()} price ${operatorText} ${formatPrice(condition_json.value)}`
  }
  
  return `${alert.symbol.toUpperCase()} ${indicator} ${operatorText} ${condition_json.value} (actual: ${formatIndicatorValue(condition_json.indicator, actualValue)})`
}

// ============ PAYLOAD BUILDER ============

function buildAlertPayload(alert: Alert, actualValue: number, price: number): AlertWorkflowPayload {
  const { condition_json } = alert
  
  return {
    alertId: alert.id,
    alertName: alert.name || `${alert.symbol} ${condition_json.indicator} Alert`,
    symbol: alert.symbol,
    assetType: alert.asset_type,
    indicator: condition_json.indicator,
    operator: condition_json.operator,
    threshold: condition_json.value,
    actualValue,
    priceAtTrigger: price,
    triggeredAt: new Date().toISOString(),
    formatted: {
      summary: formatAlertSummary(alert, actualValue, price),
      symbol: alert.symbol.toUpperCase(),
      price: formatPrice(price)
    }
  }
}

// ============ NOTIFICATION SENDING ============

async function sendInAppNotification(
  userId: string,
  payload: AlertWorkflowPayload
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        type: 'investment_alert',
        title: `🔔 ${payload.formatted.summary}`,
        body: `Your alert "${payload.alertName}" was triggered. ${payload.formatted.symbol} is now at ${payload.formatted.price}.`,
        data: payload
      })
    
    if (error) {
      console.error('Failed to insert notification:', error.message)
      return false
    }
    
    return true
  } catch (err) {
    console.error('Error sending in-app notification:', err)
    return false
  }
}

async function sendEmailNotification(
  userId: string,
  payload: AlertWorkflowPayload
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email')
    return false
  }
  
  try {
    // Get user email
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(userId)
    
    if (userError || !userData?.user?.email) {
      console.error('Could not get user email:', userError?.message)
      return false
    }
    
    const email = userData.user.email
    const { indicator, operator, threshold, actualValue, priceAtTrigger, triggeredAt } = payload
    
    // Format the email
    const operatorText = getOperatorText(operator)
    const indicatorLabel = indicator.replace('_', ' ').toUpperCase()
    const triggerTime = new Date(triggeredAt).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    })
    
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 24px;">🔔 Investment Alert Triggered</h2>
        
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Your alert <strong>"${payload.alertName}"</strong> was triggered.
        </p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 140px;">Symbol</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${payload.formatted.symbol}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Condition</td>
              <td style="padding: 8px 0; color: #1a1a1a;">${indicatorLabel} ${operatorText} ${threshold}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Actual Value</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${formatIndicatorValue(indicator, actualValue)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Price</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${payload.formatted.price}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Time</td>
              <td style="padding: 8px 0; color: #1a1a1a;">${triggerTime}</td>
            </tr>
          </table>
        </div>
        
        <a href="https://sparkwaveai.app/investments" 
           style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
          View in Sparkwave
        </a>
        
        <p style="font-size: 12px; color: #999; margin-top: 32px;">
          You're receiving this email because you set up an investment alert in Sparkwave.
          <br>To manage your alerts, visit your <a href="https://sparkwaveai.app/investments" style="color: #2563eb;">investment dashboard</a>.
        </p>
      </div>
    `
    
    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Sparkwave Alerts <alerts@sparkwaveai.app>',
        to: [email],
        subject: `🔔 Alert: ${payload.formatted.summary}`,
        html: htmlContent
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Resend API error:', errorText)
      return false
    }
    
    return true
  } catch (err) {
    console.error('Error sending email notification:', err)
    return false
  }
}

// ============ WORKFLOW EXECUTION ============

// INV-058: Wire alert evaluator to workflows
async function triggerWorkflow(
  workflowId: string,
  payload: AlertWorkflowPayload
): Promise<boolean> {
  try {
    // Call the execute-workflow function
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/execute-workflow`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowId,
          trigger: 'investment_alert',
          payload
        })
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Workflow execution failed: ${errorText}`)
      return false
    }
    
    return true
  } catch (err) {
    console.error('Error triggering workflow:', err)
    return false
  }
}

// ============ MAIN EVALUATION ============

async function evaluateAlert(alert: Alert): Promise<EvaluationResult> {
  const result: EvaluationResult = {
    alertId: alert.id,
    alertName: alert.name,
    symbol: alert.symbol,
    triggered: false,
    actualValue: null,
    threshold: alert.condition_json.value,
    indicator: alert.condition_json.indicator,
    operator: alert.condition_json.operator,
    notificationsSent: [],
    workflowTriggered: false
  }
  
  try {
    // Check cooldown
    if (isInCooldown(alert.last_triggered_at, alert.cooldown_minutes)) {
      return result // Still in cooldown, don't trigger
    }
    
    // Fetch market data
    const marketData = await getMarketData(alert.symbol, alert.asset_type)
    if (!marketData) {
      result.error = 'No market data available'
      return result
    }
    
    // Fetch indicators if needed
    let indicators: IndicatorData | null = null
    if (!['price', 'change_percent', 'volume'].includes(alert.condition_json.indicator)) {
      indicators = await getIndicators(alert.symbol, alert.asset_type)
    }
    
    // Get the actual value
    const actualValue = getIndicatorValue(alert.condition_json.indicator, marketData, indicators)
    result.actualValue = actualValue
    
    if (actualValue === null) {
      result.error = `Could not calculate ${alert.condition_json.indicator}`
      return result
    }
    
    // Evaluate condition
    const triggered = evaluateCondition(
      actualValue,
      alert.condition_json.operator,
      alert.condition_json.value
    )
    
    if (!triggered) {
      return result
    }
    
    result.triggered = true
    
    // Build payload
    const payload = buildAlertPayload(alert, actualValue, marketData.price)
    
    // Send notifications
    const notifConfig = alert.notification_config || { inApp: true } // Default to in-app
    
    if (notifConfig.inApp !== false) {
      const sent = await sendInAppNotification(alert.user_id, payload)
      if (sent) result.notificationsSent.push('inApp')
    }
    
    if (notifConfig.email) {
      const sent = await sendEmailNotification(alert.user_id, payload)
      if (sent) result.notificationsSent.push('email')
    }
    
    // Trigger workflow if configured
    if (alert.workflow_id) {
      const workflowTriggered = await triggerWorkflow(alert.workflow_id, payload)
      result.workflowTriggered = workflowTriggered
    }
    
    // Record alert event
    await supabase.from('alert_events').insert({
      alert_id: alert.id,
      condition_snapshot: {
        actualValue,
        threshold: alert.condition_json.value,
        indicator: alert.condition_json.indicator,
        operator: alert.condition_json.operator,
        price: marketData.price
      },
      workflow_triggered: result.workflowTriggered
    })
    
    // Update last_triggered_at and increment trigger_count
    const { data: currentAlert } = await supabase
      .from('investment_alerts')
      .select('trigger_count')
      .eq('id', alert.id)
      .single()
    
    await supabase
      .from('investment_alerts')
      .update({ 
        last_triggered_at: new Date().toISOString(),
        trigger_count: (currentAlert?.trigger_count || 0) + 1
      })
      .eq('id', alert.id)
    
    return result
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Unknown error'
    return result
  }
}

// ============ HANDLERS ============

async function handleEvaluateAll(): Promise<Response> {
  const startTime = Date.now()
  
  // Fetch all active alerts
  const { data: alerts, error } = await supabase
    .from('investment_alerts')
    .select('*')
    .eq('is_active', true)
  
  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch alerts' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  if (!alerts || alerts.length === 0) {
    return new Response(JSON.stringify({
      message: 'No active alerts to evaluate',
      evaluated: 0,
      triggered: 0,
      executionTimeMs: Date.now() - startTime
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  console.log(`Evaluating ${alerts.length} active alerts...`)
  
  // Evaluate all alerts
  const results: EvaluationResult[] = []
  for (const alert of alerts) {
    const result = await evaluateAlert(alert as Alert)
    results.push(result)
  }
  
  const triggered = results.filter(r => r.triggered)
  const errors = results.filter(r => r.error)
  
  console.log(`Evaluation complete: ${triggered.length} triggered, ${errors.length} errors`)
  
  return new Response(JSON.stringify({
    evaluated: alerts.length,
    triggered: triggered.length,
    errors: errors.length,
    results: results.filter(r => r.triggered || r.error), // Only return interesting results
    executionTimeMs: Date.now() - startTime
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleEvaluateSingle(alertId: string): Promise<Response> {
  const { data: alert, error } = await supabase
    .from('investment_alerts')
    .select('*')
    .eq('id', alertId)
    .single()
  
  if (error || !alert) {
    return new Response(JSON.stringify({ error: 'Alert not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const result = await evaluateAlert(alert as Alert)
  
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleTest(body: {
  symbol: string,
  assetType: 'stock' | 'crypto',
  condition: AlertCondition
}): Promise<Response> {
  const { symbol, assetType, condition } = body
  
  // Fetch market data
  const marketData = await getMarketData(symbol, assetType)
  if (!marketData) {
    return new Response(JSON.stringify({ 
      error: `No market data for ${symbol}. Make sure it's in the cache.` 
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Fetch indicators if needed
  let indicators: IndicatorData | null = null
  if (!['price', 'change_percent', 'volume'].includes(condition.indicator)) {
    indicators = await getIndicators(symbol, assetType)
  }
  
  const actualValue = getIndicatorValue(condition.indicator, marketData, indicators)
  const wouldTrigger = evaluateCondition(actualValue, condition.operator, condition.value)
  
  return new Response(JSON.stringify({
    symbol,
    assetType,
    condition,
    actualValue,
    currentPrice: marketData.price,
    wouldTrigger,
    allIndicators: {
      price: marketData.price,
      changePercent: marketData.changePercent,
      volume: marketData.volume,
      ...indicators
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// ============ MAIN HANDLER ============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  const url = new URL(req.url)
  const path = url.pathname.replace('/alert-evaluator', '').replace(/^\/+/, '')
  
  try {
    switch (path) {
      case 'evaluate':
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return await handleEvaluateAll()
      
      case 'evaluate-single':
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        const { alertId } = await req.json()
        if (!alertId) {
          return new Response(JSON.stringify({ error: 'alertId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return await handleEvaluateSingle(alertId)
      
      case 'test':
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        const testBody = await req.json()
        return await handleTest(testBody)
      
      case 'status':
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return await handleStatus()
      
      default:
        return new Response(JSON.stringify({
          service: 'alert-evaluator',
          version: '1.0.0',
          description: 'Investment alert evaluation engine with workflow integration',
          endpoints: [
            'POST /evaluate - Evaluate all active alerts',
            'POST /evaluate-single - Evaluate a specific alert { alertId }',
            'POST /test - Test a condition without triggering { symbol, assetType, condition }'
          ],
          tasks: ['INV-056', 'INV-057', 'INV-058', 'INV-060'],
          payloadSchema: {
            alertId: 'string',
            alertName: 'string',
            symbol: 'string',
            assetType: 'stock | crypto',
            indicator: 'string',
            operator: 'gt | lt | gte | lte | eq',
            threshold: 'number',
            actualValue: 'number',
            priceAtTrigger: 'number',
            triggeredAt: 'ISO string',
            formatted: {
              summary: 'Human readable summary',
              symbol: 'Uppercase symbol',
              price: 'Formatted price string'
            }
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
