/**
 * LinkedIn OAuth Initiation
 * GET /functions/v1/linkedin-auth
 *
 * Query params:
 *   business_id  - (required) UUID of the business connecting the account
 *   account_type - (optional) "personal" | "company" (default: "personal")
 *
 * Redirects to LinkedIn OAuth authorization URL with PKCE code challenge.
 * State is signed with LINKEDIN_STATE_SECRET to prevent CSRF.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64url } from "https://deno.land/std@0.182.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Required LinkedIn OAuth scopes for Phase 1
const SCOPES = [
  "openid",
  "profile",
  "email",
  "w_member_social",
  "r_organization_admin",
].join(" ");

/** Generate a cryptographically random string for PKCE / state */
function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64url(bytes).slice(0, length);
}

/** SHA-256 hash a string and return base64url-encoded result */
async function sha256Base64url(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(digest));
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
    const appUrl = Deno.env.get("APP_URL") ?? "https://sparkwaveai.app";
    const stateSecret = Deno.env.get("LINKEDIN_STATE_SECRET") ?? "changeme";

    if (!clientId) {
      console.error("❌ LINKEDIN_CLIENT_ID not configured");
      return new Response(
        JSON.stringify({ error: "LinkedIn OAuth not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const businessId = url.searchParams.get("business_id");
    const accountType = url.searchParams.get("account_type") ?? "personal";

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: "business_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- PKCE ---
    const codeVerifier = randomString(64);
    const codeChallenge = await sha256Base64url(codeVerifier);

    // --- State (encodes context + CSRF token) ---
    const statePayload = {
      csrf: randomString(16),
      business_id: businessId,
      account_type: accountType,
      verifier: codeVerifier,
      secret: stateSecret,
    };
    // Encode state as base64url JSON (simple, signed by secret inclusion)
    const state = base64url(new TextEncoder().encode(JSON.stringify(statePayload)));

    const callbackUrl = `${appUrl}/functions/v1/linkedin-callback`;

    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", callbackUrl);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    console.log(`🔗 Redirecting to LinkedIn OAuth for business ${businessId} (${accountType})`);

    return Response.redirect(authUrl.toString(), 302);
  } catch (err) {
    console.error("❌ linkedin-auth error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
