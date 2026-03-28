import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify OPENROUTER_API_KEY at startup
  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) {
    return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Auth: extract JWT and get user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jwt = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Use service role for DB operations
  const adminSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Rate limit: get cap from ops_policy
  const { data: policyRow } = await adminSupabase
    .from('ops_policy')
    .select('value')
    .eq('key', 'repurpose_daily_limit')
    .single();

  const dailyLimit = (policyRow?.value as { limit?: number } | null)?.limit ?? 20;

  // Count user's content created in last 24h
  const { count } = await adminSupabase
    .from('content_queue')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if ((count ?? 0) >= dailyLimit) {
    return new Response(JSON.stringify({ error: 'Daily limit reached', limit: dailyLimit }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parse request body
  const { sourceContent, sourceFormat, targetFormat } = await req.json();

  if (!sourceContent || !sourceFormat || !targetFormat) {
    return new Response(JSON.stringify({ error: 'Missing required fields: sourceContent, sourceFormat, targetFormat' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const systemPrompt = `You are a content repurposing expert. Transform content from one format to another while preserving the core message and value. Be concise, engaging, and platform-appropriate.`;

  const userPrompt = `Repurpose the following ${sourceFormat} into a ${targetFormat}.

Original content:
${sourceContent}

Instructions:
- Adapt the style, length, and format to suit ${targetFormat}
- Preserve the key insights and value
- Make it engaging and natural for the target format
- Do not add disclaimers about the transformation

Output only the repurposed content, nothing else.`;

  // Call OpenRouter with 1 retry on 5xx/timeout
  async function callOpenRouter(attempt = 0): Promise<Response> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'X-Title': 'Sparkwave Content Repurpose',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4-6',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok && response.status >= 500 && attempt === 0) {
        return callOpenRouter(1);
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content ?? '';
      return new Response(JSON.stringify({ result }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      if (attempt === 0 && err instanceof Error && (err.name === 'TimeoutError' || err.message.includes('timeout'))) {
        return callOpenRouter(1);
      }
      throw err;
    }
  }

  try {
    return await callOpenRouter();
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
