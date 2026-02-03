// Client AI Assistant Edge Function
// Handles chat interactions with Claude function calling
// Created: 2026-02-03

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface AssistantConfig {
  id: string;
  business_id: string;
  enabled: boolean;
  allowed_functions: string[];
  blocked_functions: string[];
  require_confirmation: string[];
  daily_limits: Record<string, number>;
  model: string;
  system_prompt_additions: string | null;
}

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  tool_name?: string;
}

interface ChatRequest {
  business_id: string;
  user_id: string;
  conversation_id?: string;
  message: string;
  confirm_action?: {
    action_id: string;
    approved: boolean;
  };
}

// Import tools (will be implemented in Task 1.3)
import { getAvailableTools, executeToolCall } from './tools.ts';
import { checkPermission, checkRateLimit } from './permissions.ts';
import { logAction } from './audit.ts';

// System prompt for the assistant
const BASE_SYSTEM_PROMPT = `You are a helpful AI assistant for a business management platform. You can help users with:
- Looking up and managing contacts
- Sending emails and SMS messages
- Creating tasks
- Viewing and booking appointments
- Managing social media posts

Be conversational, helpful, and proactive. If a user asks to do something, use the appropriate tool to help them.
When you need to perform an action, use the available tools. Always confirm sensitive actions like sending messages.
Keep responses concise and actionable.`;

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const body: ChatRequest = await req.json();
    const { business_id, user_id, conversation_id, message, confirm_action } = body;

    // Validate required fields
    if (!business_id || !user_id) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: business_id and user_id'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Load assistant configuration
    const config = await loadAssistantConfig(supabase, business_id);
    if (!config || !config.enabled) {
      return new Response(JSON.stringify({
        error: 'AI Assistant is not enabled for this business'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle action confirmation if provided
    if (confirm_action) {
      const result = await handleActionConfirmation(
        supabase,
        confirm_action.action_id,
        confirm_action.approved,
        user_id,
        business_id,
        config
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      convId = await createConversation(supabase, business_id, user_id);
    }

    // Load conversation history
    const history = await loadConversationHistory(supabase, convId);

    // Save user message
    await saveMessage(supabase, convId, 'user', message);

    // Build messages array for Claude
    const messages = buildMessageArray(history, message);

    // Get available tools based on permissions
    const tools = getAvailableTools(config);

    // Build system prompt
    const systemPrompt = config.system_prompt_additions
      ? `${BASE_SYSTEM_PROMPT}\n\n${config.system_prompt_additions}`
      : BASE_SYSTEM_PROMPT;

    // Call Claude API
    const response = await callClaude(
      anthropicApiKey,
      config.model,
      systemPrompt,
      messages,
      tools
    );

    // Process response and handle tool calls
    const result = await processClaudeResponse(
      supabase,
      response,
      convId,
      business_id,
      user_id,
      config,
      anthropicApiKey,
      systemPrompt,
      messages,
      tools
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Client assistant error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper functions

async function loadAssistantConfig(
  supabase: SupabaseClient,
  businessId: string
): Promise<AssistantConfig | null> {
  const { data, error } = await supabase
    .from('client_assistant_config')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (error || !data) {
    console.error('Error loading config:', error);
    return null;
  }

  return data as AssistantConfig;
}

async function createConversation(
  supabase: SupabaseClient,
  businessId: string,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('assistant_conversations')
    .insert({
      business_id: businessId,
      user_id: userId,
      title: `Chat ${new Date().toLocaleDateString()}`
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data.id;
}

async function loadConversationHistory(
  supabase: SupabaseClient,
  conversationId: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('assistant_messages')
    .select('role, content, tool_calls, tool_call_id, tool_name')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(50); // Limit to last 50 messages

  if (error) {
    console.error('Error loading history:', error);
    return [];
  }

  return data as Message[];
}

async function saveMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: string,
  content: string,
  toolCalls?: any[],
  toolCallId?: string,
  toolName?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('assistant_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      tool_calls: toolCalls,
      tool_call_id: toolCallId,
      tool_name: toolName
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to save message: ${error.message}`);
  return data.id;
}

function buildMessageArray(history: Message[], newMessage: string): any[] {
  const messages: any[] = [];

  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push({
          role: 'assistant',
          content: msg.content || '',
          tool_use: msg.tool_calls
        });
      } else {
        messages.push({ role: 'assistant', content: msg.content });
      }
    } else if (msg.role === 'tool') {
      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: msg.tool_call_id,
          content: msg.content
        }]
      });
    }
  }

  // Add the new message
  messages.push({ role: 'user', content: newMessage });

  return messages;
}

async function callClaude(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: any[],
  tools: any[]
): Promise<any> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  return await response.json();
}

async function processClaudeResponse(
  supabase: SupabaseClient,
  response: any,
  conversationId: string,
  businessId: string,
  userId: string,
  config: AssistantConfig,
  apiKey: string,
  systemPrompt: string,
  messages: any[],
  tools: any[]
): Promise<any> {
  const content = response.content || [];
  let textResponse = '';
  const toolCalls: any[] = [];
  const pendingActions: any[] = [];
  const executedActions: any[] = [];

  // Process content blocks
  for (const block of content) {
    if (block.type === 'text') {
      textResponse += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push(block);
    }
  }

  // Handle tool calls
  if (toolCalls.length > 0) {
    // Save assistant message with tool calls
    const messageId = await saveMessage(
      supabase,
      conversationId,
      'assistant',
      textResponse,
      toolCalls
    );

    // Process each tool call
    const toolResults: any[] = [];

    for (const toolCall of toolCalls) {
      const { id: toolUseId, name: toolName, input: toolInput } = toolCall;

      // Check permission
      const permissionCheck = checkPermission(toolName, config);
      if (!permissionCheck.allowed) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: `Error: ${permissionCheck.reason}`,
          is_error: true
        });
        continue;
      }

      // Check rate limit
      const rateLimitCheck = await checkRateLimit(
        supabase,
        businessId,
        toolName,
        config
      );
      if (!rateLimitCheck.allowed) {
        // Log rate-limited action
        await logAction(supabase, {
          conversation_id: conversationId,
          message_id: messageId,
          business_id: businessId,
          user_id: userId,
          function_name: toolName,
          function_input: toolInput,
          status: 'rate_limited',
          error_message: rateLimitCheck.reason
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: `Rate limit exceeded: ${rateLimitCheck.reason}`,
          is_error: true
        });
        continue;
      }

      // Check if confirmation required
      if (config.require_confirmation.includes(toolName)) {
        // Create pending action
        const actionId = await logAction(supabase, {
          conversation_id: conversationId,
          message_id: messageId,
          business_id: businessId,
          user_id: userId,
          function_name: toolName,
          function_input: toolInput,
          status: 'pending',
          required_confirmation: true
        });

        pendingActions.push({
          action_id: actionId,
          tool_use_id: toolUseId,
          function_name: toolName,
          function_input: toolInput
        });

        // Save tool result placeholder
        await saveMessage(
          supabase,
          conversationId,
          'tool',
          'Awaiting user confirmation...',
          undefined,
          toolUseId,
          toolName
        );

        continue;
      }

      // Execute the tool
      const startTime = Date.now();
      try {
        const result = await executeToolCall(
          supabase,
          toolName,
          toolInput,
          businessId,
          userId
        );

        const executionTime = Date.now() - startTime;

        // Log successful action
        await logAction(supabase, {
          conversation_id: conversationId,
          message_id: messageId,
          business_id: businessId,
          user_id: userId,
          function_name: toolName,
          function_input: toolInput,
          function_output: result,
          status: 'executed',
          execution_time_ms: executionTime
        });

        executedActions.push({
          function_name: toolName,
          result
        });

        // Save tool result
        await saveMessage(
          supabase,
          conversationId,
          'tool',
          JSON.stringify(result),
          undefined,
          toolUseId,
          toolName
        );

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: JSON.stringify(result)
        });

      } catch (error: any) {
        const executionTime = Date.now() - startTime;

        // Log failed action
        await logAction(supabase, {
          conversation_id: conversationId,
          message_id: messageId,
          business_id: businessId,
          user_id: userId,
          function_name: toolName,
          function_input: toolInput,
          status: 'failed',
          error_message: error.message,
          execution_time_ms: executionTime
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: `Error executing ${toolName}: ${error.message}`,
          is_error: true
        });
      }
    }

    // If we have pending actions, return early and wait for confirmation
    if (pendingActions.length > 0) {
      return {
        conversation_id: conversationId,
        response: textResponse || 'I need your confirmation before proceeding.',
        pending_actions: pendingActions,
        executed_actions: executedActions
      };
    }

    // If we executed tools, make another call to Claude for final response
    if (toolResults.length > 0 && toolResults.some(r => !r.is_error)) {
      const updatedMessages = [
        ...messages,
        { role: 'assistant', content },
        { role: 'user', content: toolResults }
      ];

      const finalResponse = await callClaude(
        apiKey,
        config.model,
        systemPrompt,
        updatedMessages,
        tools
      );

      // Extract final text response
      let finalText = '';
      for (const block of finalResponse.content || []) {
        if (block.type === 'text') {
          finalText += block.text;
        }
      }

      // Save final assistant response
      await saveMessage(supabase, conversationId, 'assistant', finalText);

      return {
        conversation_id: conversationId,
        response: finalText,
        executed_actions: executedActions
      };
    }
  }

  // No tool calls - just save and return text response
  await saveMessage(supabase, conversationId, 'assistant', textResponse);

  return {
    conversation_id: conversationId,
    response: textResponse
  };
}

async function handleActionConfirmation(
  supabase: SupabaseClient,
  actionId: string,
  approved: boolean,
  userId: string,
  businessId: string,
  config: AssistantConfig
): Promise<any> {
  // Load the pending action
  const { data: action, error } = await supabase
    .from('assistant_actions')
    .select('*')
    .eq('id', actionId)
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .single();

  if (error || !action) {
    return { error: 'Action not found or already processed' };
  }

  if (!approved) {
    // User denied the action
    await supabase
      .from('assistant_actions')
      .update({
        status: 'denied',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', actionId);

    return {
      status: 'denied',
      message: 'Action was cancelled by user'
    };
  }

  // Execute the approved action
  const startTime = Date.now();
  try {
    const result = await executeToolCall(
      supabase,
      action.function_name,
      action.function_input,
      businessId,
      userId
    );

    const executionTime = Date.now() - startTime;

    // Update action status
    await supabase
      .from('assistant_actions')
      .update({
        status: 'executed',
        function_output: result,
        execution_time_ms: executionTime,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', actionId);

    // Update the tool message in conversation
    if (action.message_id) {
      const { data: messages } = await supabase
        .from('assistant_messages')
        .select('*')
        .eq('id', action.message_id);

      // Find and update the tool result message
      // (This is simplified - in production you'd want better message linking)
    }

    return {
      status: 'executed',
      function_name: action.function_name,
      result
    };

  } catch (error: any) {
    const executionTime = Date.now() - startTime;

    await supabase
      .from('assistant_actions')
      .update({
        status: 'failed',
        error_message: error.message,
        execution_time_ms: executionTime,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', actionId);

    return {
      status: 'failed',
      error: error.message
    };
  }
}
