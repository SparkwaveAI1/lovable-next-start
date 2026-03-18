/**
 * LinkedIn Accounts API
 *
 * GET  /functions/v1/linkedin-accounts?business_id=UUID
 *   Returns list of connected LinkedIn accounts for a business
 *
 * DELETE /functions/v1/linkedin-accounts?id=UUID&business_id=UUID
 *   Soft-deletes (deactivates) a LinkedIn account connection
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Authenticate the caller: verify JWT from Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Use the caller's JWT to verify identity, then use service role for data access
  const userToken = authHeader.replace("Bearer ", "");
  const userSupabase = createClient(supabaseUrl, userToken, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userSupabase.auth.getUser();

  if (authErr || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const url = new URL(req.url);

  try {
    // ---- GET: list connected accounts for a business ----
    if (req.method === "GET") {
      const businessId = url.searchParams.get("business_id");
      if (!businessId) {
        return new Response(
          JSON.stringify({ error: "business_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user belongs to this business
      const { data: membership } = await supabase
        .from("business_permissions")
        .select("business_id")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!membership) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: accounts, error: fetchErr } = await supabase
        .from("linkedin_accounts")
        .select(
          "id, business_id, account_type, linkedin_urn, account_name, profile_url, logo_url, " +
          "timezone, token_expires_at, is_active, created_at, updated_at, " +
          "last_refresh_at, refresh_error_count"
          // NOTE: access_token_encrypted intentionally excluded from response
        )
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (fetchErr) {
        console.error("❌ Error fetching LinkedIn accounts:", fetchErr);
        return new Response(
          JSON.stringify({ error: "Failed to fetch accounts" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Augment with token health
      const now = new Date();
      const accountsWithHealth = (accounts ?? []).map((acct) => {
        const expiresAt = new Date(acct.token_expires_at);
        const hoursUntilExpiry =
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        let tokenHealth: "valid" | "expiring_soon" | "expired";
        if (hoursUntilExpiry <= 0) {
          tokenHealth = "expired";
        } else if (hoursUntilExpiry <= 24) {
          tokenHealth = "expiring_soon";
        } else {
          tokenHealth = "valid";
        }
        return { ...acct, token_health: tokenHealth };
      });

      return new Response(
        JSON.stringify({ success: true, accounts: accountsWithHealth }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- DELETE: disconnect (deactivate) an account ----
    if (req.method === "DELETE") {
      const accountId = url.searchParams.get("id");
      const businessId = url.searchParams.get("business_id");

      if (!accountId || !businessId) {
        return new Response(
          JSON.stringify({ error: "id and business_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user belongs to this business
      const { data: membership } = await supabase
        .from("business_permissions")
        .select("business_id")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!membership) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Soft delete — set is_active = false and clear encrypted tokens
      const { error: deleteErr } = await supabase
        .from("linkedin_accounts")
        .update({
          is_active: false,
          access_token_encrypted: "[REVOKED]",
          refresh_token_encrypted: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId)
        .eq("business_id", businessId);

      if (deleteErr) {
        console.error("❌ Error disconnecting LinkedIn account:", deleteErr);
        return new Response(
          JSON.stringify({ error: "Failed to disconnect account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`✅ LinkedIn account ${accountId} disconnected by user ${user.id}`);
      return new Response(
        JSON.stringify({ success: true, message: "Account disconnected" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Method not allowed ----
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ linkedin-accounts unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
