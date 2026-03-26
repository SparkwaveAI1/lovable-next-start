/**
 * LinkedIn Publish Text Post
 *
 * POST /functions/v1/linkedin-publish-text
 * Body: { account_id: string, content: string }
 *
 * Creates a text post on a personal LinkedIn account immediately.
 * Phase 2A: text-only, publish-now, personal accounts only.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_CHARS = 3000;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encryptionKey = Deno.env.get("LINKEDIN_ENCRYPTION_KEY");

  // Authenticate caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

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

  let body: { account_id?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { account_id, content } = body;

  // Validate inputs
  if (!account_id || !content) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: account_id and content" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (content.length > MAX_CHARS) {
    return new Response(
      JSON.stringify({ error: `Content exceeds ${MAX_CHARS} character limit` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Load account — verify it exists and is active
    const { data: account, error: accountError } = await supabase
      .from("linkedin_accounts")
      .select("*")
      .eq("id", account_id)
      .eq("is_active", true)
      .single();

    if (accountError || !account) {
      console.error("❌ Account not found:", accountError);
      return new Response(
        JSON.stringify({ error: "LinkedIn account not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to this account's business
    const { data: membership } = await supabase
      .from("business_permissions")
      .select("business_id")
      .eq("business_id", account.business_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check token expiry
    if (new Date(account.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          error: "LinkedIn access token expired. Please reconnect your account at /linkedin.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create post record in 'publishing' state
    const { data: post, error: postError } = await supabase
      .from("linkedin_posts")
      .insert({
        account_id,
        content,
        post_type: "text",
        status: "publishing",
        created_by: user.id,
      })
      .select()
      .single();

    if (postError || !post) {
      console.error("❌ Failed to create post record:", postError);
      return new Response(
        JSON.stringify({ error: "Failed to create post record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt the access token
    // Tokens may be stored as pgp_sym_encrypt ciphertext, or as "raw:<token>" fallback
    const rawAccessToken = account.access_token_encrypted as string;
    let accessToken: string;

    if (rawAccessToken.startsWith("raw:")) {
      // Fallback storage path from linkedin-callback (pgcrypto RPC unavailable)
      accessToken = rawAccessToken.slice(4);
      console.log("ℹ️ Using raw (unencrypted) token storage path");
    } else if (encryptionKey) {
      // Decrypt using pgp_sym_decrypt via Supabase RPC
      const { data: decrypted, error: decryptErr } = await supabase
        .rpc("decrypt_linkedin_token", {
          p_encrypted: rawAccessToken,
          p_encryption_key: encryptionKey,
        });

      if (decryptErr || !decrypted) {
        // Try direct SQL fallback
        console.error("❌ RPC decrypt failed:", decryptErr);
        await supabase
          .from("linkedin_posts")
          .update({ status: "failed", error_message: "Failed to decrypt LinkedIn token" })
          .eq("id", post.id);

        return new Response(
          JSON.stringify({ error: "Failed to decrypt LinkedIn token. Please reconnect your account." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      accessToken = decrypted as string;
    } else {
      console.error("❌ LINKEDIN_ENCRYPTION_KEY not set");
      await supabase
        .from("linkedin_posts")
        .update({ status: "failed", error_message: "Server configuration error" })
        .eq("id", post.id);

      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the LinkedIn UGC Post API request
    // URN format: urn:li:person:<id> — extract person ID from stored URN
    const linkedinUrn: string = account.linkedin_urn;

    const ugcPostData = {
      author: linkedinUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    console.log(`📤 Publishing LinkedIn post for account ${account.account_name}...`);

    const linkedinResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(ugcPostData),
    });

    if (!linkedinResponse.ok) {
      const errorBody = await linkedinResponse.text();
      console.error(`❌ LinkedIn API error ${linkedinResponse.status}:`, errorBody);

      const errorMsg = `LinkedIn API error ${linkedinResponse.status}: ${errorBody.slice(0, 200)}`;

      await supabase
        .from("linkedin_posts")
        .update({ status: "failed", error_message: errorMsg })
        .eq("id", post.id);

      // Surface token errors with a helpful message
      if (linkedinResponse.status === 401 || linkedinResponse.status === 403) {
        return new Response(
          JSON.stringify({
            error: "LinkedIn authorization failed. Your token may have been revoked. Please reconnect your account at /linkedin.",
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Failed to publish to LinkedIn (${linkedinResponse.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse LinkedIn response to get the post URN
    const linkedinResult = await linkedinResponse.json();
    const postUrn: string = linkedinResult.id ?? linkedinResult.value?.id ?? "";

    console.log(`✅ LinkedIn post published: ${postUrn}`);

    // Update post record with URN and published status
    const { error: updateError } = await supabase
      .from("linkedin_posts")
      .update({
        post_urn: postUrn,
        status: "published",
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (updateError) {
      // Non-fatal: post was published, just metadata update failed
      console.error("⚠️ Failed to update post record:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        post_id: post.id,
        post_urn: postUrn,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("❌ linkedin-publish-text unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
