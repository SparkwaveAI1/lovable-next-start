/**
 * LinkedIn OG Preview
 *
 * POST /functions/v1/linkedin-og-preview
 * Body: { url: string }
 *
 * Fetches Open Graph metadata for a URL to render article previews.
 * Includes SSRF prevention: blocks private IP ranges.
 * Returns gracefully on all errors so the UI can show "preview unavailable".
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

  try {
    let body: { url?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ title: null, description: null, image: null, error: "Invalid JSON body" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { url } = body;
    if (!url) {
      return new Response(
        JSON.stringify({ title: null, description: null, image: null, error: "url is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SSRF prevention step 1: validate protocol
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ title: null, description: null, image: null, error: "Invalid URL" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new Response(
        JSON.stringify({ title: null, description: null, image: null, error: "Invalid protocol" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SSRF prevention step 2: DNS-resolve hostname and block private ranges
    const [ipv4Addrs, ipv6Addrs] = await Promise.all([
      Deno.resolveDns(parsed.hostname, "A").catch(() => [] as string[]),
      Deno.resolveDns(parsed.hostname, "AAAA").catch(() => [] as string[]),
    ]);
    const allAddrs = [...ipv4Addrs, ...ipv6Addrs];

    if (allAddrs.length === 0) {
      return new Response(
        JSON.stringify({ title: null, description: null, image: null, error: "Could not resolve hostname" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const privateIPv4 = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/;
    const privateIPv6 = /^(::1$|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:|fe80:)/i;

    for (const addr of allAddrs) {
      if (privateIPv4.test(addr) || privateIPv6.test(addr)) {
        return new Response(
          JSON.stringify({ title: null, description: null, image: null, error: "Private IP not allowed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch the page
    const res = await fetch(url, {
      headers: { "User-Agent": "LinkedInBot/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    const html = await res.text();

    // Robust multi-order OG tag extraction
    // Handles reversed attribute order (content= before property=)
    const extractMeta = (prop: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"),
        new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1];
      }
      return null;
    };

    // Fallback chain: og: tags → name= meta → <title> tag
    const title =
      extractMeta("title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      null;

    const description =
      extractMeta("description") ||
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      null;

    const image =
      extractMeta("image") ||
      html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
      null;

    return new Response(
      JSON.stringify({ title, description, image }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    // Graceful degradation — UI shows "preview unavailable"
    console.error("❌ linkedin-og-preview error:", err?.message);
    return new Response(
      JSON.stringify({ title: null, description: null, image: null, error: err?.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
