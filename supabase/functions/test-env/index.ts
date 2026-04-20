Deno.serve(async (req) => {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SERVICE_ROLE_JWT') || '';
  
  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const supabase = createClient(url, key);
  
  // Try to insert with REAL business ID
  const { data, error } = await supabase.from('automation_logs').insert({
    business_id: '456dc53b-d9d9-41b0-bc33-4f4c4a791eff',
    automation_type: 'test_real_biz_write',
    status: 'info',
    error_message: 'DB write with real biz ID'
  }).select();
  
  return new Response(JSON.stringify({ 
    inserted: !!data,
    error: error?.message || null,
  }), { headers: { 'Content-Type': 'application/json' } });
});
