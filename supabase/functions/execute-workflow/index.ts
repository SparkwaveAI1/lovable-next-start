/**
 * Execute Workflow Edge Function
 * INV-056: Workflow Trigger Type
 * INV-058: Wire alert evaluator to workflows
 * 
 * Simple workflow execution engine that can be triggered by:
 * - Investment alerts
 * - Scheduled triggers
 * - Manual triggers
 * 
 * Endpoints:
 * - POST / - Execute a workflow
 * - GET /triggers - List available trigger types
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============ TYPES ============

// INV-056: Investment Alert Trigger Type
interface InvestmentAlertTrigger {
  type: 'investment_alert'
  config: {
    alertId?: string      // Specific alert, or
    anyAlert?: boolean    // Any alert from this user
    symbols?: string[]    // Filter by symbols
    indicators?: string[] // Filter by indicator type
  }
}

// Generic trigger type union (extensible)
type WorkflowTrigger = InvestmentAlertTrigger | {
  type: 'scheduled'
  config: {
    cron?: string
    interval?: string
  }
} | {
  type: 'manual'
  config: Record<string, unknown>
} | {
  type: 'webhook'
  config: {
    secret?: string
  }
}

// INV-057: Alert Workflow Payload (received from alert-evaluator)
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

interface WorkflowAction {
  type: 'send_email' | 'send_sms' | 'webhook' | 'discord' | 'log'
  config: Record<string, unknown>
}

interface Workflow {
  id: string
  user_id: string
  business_id: string | null
  name: string
  trigger: WorkflowTrigger
  actions: WorkflowAction[]
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ExecuteWorkflowRequest {
  workflowId: string
  trigger: string
  payload: AlertWorkflowPayload | Record<string, unknown>
}

interface WorkflowExecutionLog {
  workflow_id: string
  trigger_type: string
  payload: Record<string, unknown>
  actions_executed: string[]
  success: boolean
  error?: string
  executed_at: string
}

// ============ ACTION EXECUTORS ============

async function executeLogAction(
  _config: Record<string, unknown>,
  payload: Record<string, unknown>
): Promise<boolean> {
  console.log('Workflow log action:', JSON.stringify(payload, null, 2))
  return true
}

async function executeDiscordAction(
  config: Record<string, unknown>,
  payload: AlertWorkflowPayload
): Promise<boolean> {
  const webhookUrl = config.webhookUrl as string
  if (!webhookUrl) {
    console.error('Discord webhook URL not configured')
    return false
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `🔔 ${payload.formatted.summary}`,
          description: `Alert "${payload.alertName}" was triggered`,
          color: 0x2563eb,
          fields: [
            { name: 'Symbol', value: payload.formatted.symbol, inline: true },
            { name: 'Price', value: payload.formatted.price, inline: true },
            { name: 'Indicator', value: payload.indicator, inline: true },
            { name: 'Actual Value', value: payload.actualValue.toString(), inline: true },
            { name: 'Threshold', value: payload.threshold.toString(), inline: true }
          ],
          timestamp: payload.triggeredAt
        }]
      })
    })
    
    return response.ok
  } catch (err) {
    console.error('Discord webhook error:', err)
    return false
  }
}

async function executeWebhookAction(
  config: Record<string, unknown>,
  payload: Record<string, unknown>
): Promise<boolean> {
  const url = config.url as string
  if (!url) {
    console.error('Webhook URL not configured')
    return false
  }
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (config.secret) {
      headers['X-Webhook-Secret'] = config.secret as string
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    
    return response.ok
  } catch (err) {
    console.error('Webhook error:', err)
    return false
  }
}

async function executeSendEmailAction(
  config: Record<string, unknown>,
  payload: AlertWorkflowPayload
): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: config.to as string,
        subject: `Workflow: ${payload.formatted.summary}`,
        html: `
          <h2>Workflow Triggered</h2>
          <p>Alert: ${payload.alertName}</p>
          <p>Summary: ${payload.formatted.summary}</p>
          <p>Symbol: ${payload.formatted.symbol}</p>
          <p>Price: ${payload.formatted.price}</p>
        `,
        from_name: 'Sparkwave Workflows',
        from_email: config.from as string || 'workflows@sparkwaveai.app'
      })
    })
    
    return response.ok
  } catch (err) {
    console.error('Send email action error:', err)
    return false
  }
}

async function executeSendSmsAction(
  config: Record<string, unknown>,
  payload: AlertWorkflowPayload
): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: config.to as string,
        message: `🔔 ${payload.formatted.summary}\n${payload.formatted.symbol}: ${payload.formatted.price}`
      })
    })
    
    return response.ok
  } catch (err) {
    console.error('Send SMS action error:', err)
    return false
  }
}

// ============ WORKFLOW EXECUTION ============

async function executeWorkflow(request: ExecuteWorkflowRequest): Promise<{
  success: boolean
  actionsExecuted: string[]
  errors: string[]
}> {
  const { workflowId, trigger, payload } = request
  const actionsExecuted: string[] = []
  const errors: string[] = []
  
  // For now, we'll support workflows defined in a simple table
  // or hardcoded configurations. In production, this would be a full workflow engine.
  
  // Try to fetch workflow from database
  const { data: workflow, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('is_active', true)
    .single()
  
  if (error || !workflow) {
    // If no workflow table exists yet, log the execution for debugging
    console.log(`Workflow ${workflowId} triggered by ${trigger}`)
    console.log('Payload:', JSON.stringify(payload, null, 2))
    
    // Log the execution attempt
    await logWorkflowExecution({
      workflow_id: workflowId,
      trigger_type: trigger,
      payload: payload as Record<string, unknown>,
      actions_executed: ['log'],
      success: true,
      executed_at: new Date().toISOString()
    })
    
    return {
      success: true,
      actionsExecuted: ['log'],
      errors: []
    }
  }
  
  // Execute each action in the workflow
  const actions = workflow.actions as WorkflowAction[]
  const alertPayload = payload as AlertWorkflowPayload
  
  for (const action of actions) {
    try {
      let success = false
      
      switch (action.type) {
        case 'log':
          success = await executeLogAction(action.config, payload as Record<string, unknown>)
          break
        case 'discord':
          success = await executeDiscordAction(action.config, alertPayload)
          break
        case 'webhook':
          success = await executeWebhookAction(action.config, payload as Record<string, unknown>)
          break
        case 'send_email':
          success = await executeSendEmailAction(action.config, alertPayload)
          break
        case 'send_sms':
          success = await executeSendSmsAction(action.config, alertPayload)
          break
        default:
          console.warn(`Unknown action type: ${action.type}`)
          errors.push(`Unknown action: ${action.type}`)
          continue
      }
      
      if (success) {
        actionsExecuted.push(action.type)
      } else {
        errors.push(`Action ${action.type} failed`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Action ${action.type}: ${errorMsg}`)
    }
  }
  
  // Log execution
  await logWorkflowExecution({
    workflow_id: workflowId,
    trigger_type: trigger,
    payload: payload as Record<string, unknown>,
    actions_executed: actionsExecuted,
    success: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    executed_at: new Date().toISOString()
  })
  
  return {
    success: errors.length === 0,
    actionsExecuted,
    errors
  }
}

async function logWorkflowExecution(log: WorkflowExecutionLog): Promise<void> {
  try {
    // Try to insert into workflow_executions table if it exists
    await supabase
      .from('workflow_executions')
      .insert(log)
  } catch {
    // Table might not exist, just log to console
    console.log('Workflow execution:', JSON.stringify(log, null, 2))
  }
}

// ============ HANDLERS ============

async function handleExecute(body: ExecuteWorkflowRequest): Promise<Response> {
  if (!body.workflowId || !body.trigger || !body.payload) {
    return new Response(JSON.stringify({ 
      error: 'Missing required fields: workflowId, trigger, payload' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const result = await executeWorkflow(body)
  
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function handleTriggers(): Response {
  return new Response(JSON.stringify({
    triggers: [
      {
        type: 'investment_alert',
        description: 'Triggered when an investment alert condition is met',
        configSchema: {
          alertId: 'string (optional) - specific alert ID',
          anyAlert: 'boolean (optional) - trigger on any alert',
          symbols: 'string[] (optional) - filter by symbols',
          indicators: 'string[] (optional) - filter by indicator type'
        },
        payloadSchema: {
          alertId: 'string',
          alertName: 'string',
          symbol: 'string',
          assetType: 'stock | crypto',
          indicator: 'string',
          operator: 'string',
          threshold: 'number',
          actualValue: 'number',
          priceAtTrigger: 'number',
          triggeredAt: 'ISO string',
          formatted: {
            summary: 'string',
            symbol: 'string',
            price: 'string'
          }
        }
      },
      {
        type: 'scheduled',
        description: 'Triggered on a schedule',
        configSchema: {
          cron: 'string - cron expression',
          interval: 'string - interval (e.g., "1h", "30m")'
        }
      },
      {
        type: 'manual',
        description: 'Manually triggered via API',
        configSchema: {}
      },
      {
        type: 'webhook',
        description: 'Triggered by external webhook',
        configSchema: {
          secret: 'string (optional) - webhook secret for verification'
        }
      }
    ],
    actions: [
      { type: 'send_email', description: 'Send an email' },
      { type: 'send_sms', description: 'Send an SMS' },
      { type: 'discord', description: 'Send to Discord webhook' },
      { type: 'webhook', description: 'Call external webhook' },
      { type: 'log', description: 'Log to console' }
    ]
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
  const path = url.pathname.replace('/execute-workflow', '').replace(/^\/+/, '')
  
  try {
    switch (path) {
      case '':
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        const body = await req.json()
        return await handleExecute(body)
      
      case 'triggers':
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return handleTriggers()
      
      default:
        return new Response(JSON.stringify({
          service: 'execute-workflow',
          version: '1.0.0',
          description: 'Simple workflow execution engine',
          endpoints: [
            'POST / - Execute a workflow { workflowId, trigger, payload }',
            'GET /triggers - List available trigger types and actions'
          ],
          tasks: ['INV-056', 'INV-058']
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
