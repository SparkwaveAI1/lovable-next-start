import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface PostizResponse {
  posts: PostizPost[];
  error?: string;
}

interface PostizPost {
  id: string;
  content: string;
  publishDate: string;
  state: string;
  integration: {
    name: string;
    providerIdentifier: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("POSTIZ_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          posts: [],
          error: "POSTIZ_API_KEY not configured",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const today = new Date();
    const startDate = today.toISOString();
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const endDate = thirtyDaysFromNow.toISOString();

    const response = await fetch(
      `https://api.postiz.com/public/v1/posts?startDate=${encodeURIComponent(
        startDate
      )}&endDate=${encodeURIComponent(endDate)}`,
      {
        method: "GET",
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`Postiz API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({
          posts: [],
          error: `Postiz API returned ${response.status}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const posts = (data.posts || []).map((post: any) => ({
      id: post.id,
      content: stripHtml(post.content || ""),
      publishDate: post.publishDate,
      state: post.state,
      integration: {
        name: post.integration?.name || "Unknown",
        providerIdentifier: post.integration?.providerIdentifier || "unknown",
      },
    }));

    return new Response(JSON.stringify({ posts }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        posts: [],
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
