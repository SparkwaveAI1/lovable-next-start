import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/**
 * wakeup-iris — creates a Paperclip issue assigned to Iris
 * Called by OutreachApprovalQueue when Scott approves a batch.
 * Iris agent ID: 15562d82-85f5-4d52-bc72-b038ba21da35
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batch_id, batch_label } = await req.json();

    if (!batch_id || !batch_label) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required fields: batch_id, batch_label' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PAPERCLIP_URL = Deno.env.get('PAPERCLIP_URL');
    const PAPERCLIP_KEY = Deno.env.get('PAPERCLIP_KEY');

    if (!PAPERCLIP_URL || !PAPERCLIP_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing Paperclip config' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resp = await fetch(`${PAPERCLIP_URL}/api/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAPERCLIP_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Outreach Batch Approved — Send Now: ${batch_label}`,
        description: `Scott approved batch ${batch_id}. Send immediately via outreach_batches WHERE id='${batch_id}'.`,
        assigneeAgentId: '15562d82-85f5-4d52-bc72-b038ba21da35',
        priority: 'high',
        status: 'todo',
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(
        JSON.stringify({ ok: false, error: err }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
