/**
 * LinkedIn Publish (Phase 2C — all post types)
 *
 * POST /functions/v1/linkedin-publish
 * Body:
 *   {
 *     account_id:     string          (required)
 *     post_type:      'text' | 'image' | 'article'  (required)
 *     content:        string          (required for text; caption for image/article)
 *     media_asset_id: string          (required when post_type === 'image')
 *     article_url:    string          (required when post_type === 'article')
 *     article_title:  string          (optional — OG title for article card)
 *     article_desc:   string          (optional — OG description for article card)
 *   }
 *
 * Handles text, image, and article posts on both personal and company accounts.
 * Replaces linkedin-publish-text for all new publishes.
 * linkedin-publish-text remains deployed for Phase 2A backward compat.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_CHARS = 3000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];
const VALID_POST_TYPES = ["text", "image", "article"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Extract person / org ID from a LinkedIn URN */
function extractUrnId(urn: string): string {
  const parts = urn.split(":");
  return parts[parts.length - 1];
}

/** Determine if a LinkedIn URN is for an organization */
function isOrgUrn(urn: string): boolean {
  return urn.startsWith("urn:li:organization:");
}

// ---------------------------------------------------------------------------
// Token decryption (same logic as linkedin-publish-text)
// ---------------------------------------------------------------------------

async function decryptToken(
  supabase: ReturnType<typeof createClient>,
  rawToken: string,
  encryptionKey: string | undefined
): Promise<{ token: string | null; error: string | null }> {
  if (rawToken.startsWith("raw:")) {
    return { token: rawToken.slice(4), error: null };
  }
  if (!encryptionKey) {
    return { token: null, error: "Server configuration error: missing encryption key" };
  }
  const { data: decrypted, error: decryptErr } = await supabase.rpc(
    "decrypt_linkedin_token",
    { p_encrypted: rawToken, p_encryption_key: encryptionKey }
  );
  if (decryptErr || !decrypted) {
    return { token: null, error: "Failed to decrypt LinkedIn token" };
  }
  return { token: decrypted as string, error: null };
}

// ---------------------------------------------------------------------------
// LinkedIn API — image upload (register + upload binary)
// ---------------------------------------------------------------------------

async function registerAndUploadImage(
  accessToken: string,
  authorUrn: string,
  imageBytes: Uint8Array,
  mimeType: string
): Promise<{ assetUrn: string | null; error: string | null }> {
  // Step 1: Register upload
  const registerBody = {
    registerUploadRequest: {
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      owner: authorUrn,
      serviceRelationships: [
        {
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        },
      ],
    },
  };

  const registerRes = await fetch(
    "https://api.linkedin.com/v2/assets?action=registerUpload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(registerBody),
    }
  );

  if (!registerRes.ok) {
    const err = await registerRes.text();
    return { assetUrn: null, error: `LinkedIn registerUpload failed (${registerRes.status}): ${err.slice(0, 200)}` };
  }

  const registerData = await registerRes.json();
  const uploadUrl: string =
    registerData?.value?.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]?.uploadUrl;
  const assetUrn: string = registerData?.value?.asset;

  if (!uploadUrl || !assetUrn) {
    return { assetUrn: null, error: "LinkedIn registerUpload: missing uploadUrl or asset URN in response" };
  }

  // Step 2: Upload binary
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": mimeType,
    },
    body: imageBytes,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return { assetUrn: null, error: `LinkedIn image upload failed (${uploadRes.status}): ${err.slice(0, 200)}` };
  }

  return { assetUrn, error: null };
}

// ---------------------------------------------------------------------------
// LinkedIn API — publish via UGC (personal)
// ---------------------------------------------------------------------------

async function publishUgcPost(
  accessToken: string,
  authorUrn: string,
  content: string,
  postType: string,
  assetUrn?: string,
  articleUrl?: string,
  articleTitle?: string,
  articleDesc?: string
): Promise<{ postUrn: string | null; error: string | null }> {
  let shareMediaCategory: string;
  let media: unknown[] | undefined;

  if (postType === "image" && assetUrn) {
    shareMediaCategory = "IMAGE";
    media = [
      {
        status: "READY",
        description: { text: content },
        media: assetUrn,
      },
    ];
  } else if (postType === "article" && articleUrl) {
    shareMediaCategory = "ARTICLE";
    media = [
      {
        status: "READY",
        originalUrl: articleUrl,
        title: articleTitle ? { text: articleTitle } : undefined,
        description: articleDesc ? { text: articleDesc } : undefined,
      },
    ];
  } else {
    shareMediaCategory = "NONE";
  }

  const ugcBody: Record<string, unknown> = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content },
        shareMediaCategory,
        ...(media ? { media } : {}),
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(ugcBody),
  });

  if (!res.ok) {
    const err = await res.text();
    return { postUrn: null, error: `LinkedIn UGC API error (${res.status}): ${err.slice(0, 300)}` };
  }

  const data = await res.json();
  const postUrn: string = data?.id ?? data?.value?.id ?? "";
  return { postUrn, error: null };
}

// ---------------------------------------------------------------------------
// LinkedIn API — publish via Shares (company)
// ---------------------------------------------------------------------------

async function publishCompanyShare(
  accessToken: string,
  authorUrn: string,
  content: string,
  postType: string,
  assetUrn?: string,
  articleUrl?: string,
  articleTitle?: string,
  articleDesc?: string
): Promise<{ postUrn: string | null; error: string | null }> {
  let shareContent: Record<string, unknown> | undefined;
  let shareMediaCategory = "NONE";

  if (postType === "image" && assetUrn) {
    shareMediaCategory = "IMAGE";
    shareContent = {
      contentEntities: [{ entity: assetUrn }],
      shareMediaCategory,
    };
  } else if (postType === "article" && articleUrl) {
    shareMediaCategory = "ARTICLE";
    shareContent = {
      contentEntities: [
        {
          entityLocation: articleUrl,
          thumbnails: [],
          title: articleTitle ?? "",
          description: articleDesc ?? "",
        },
      ],
      shareMediaCategory,
    };
  }

  const sharesBody: Record<string, unknown> = {
    owner: authorUrn,
    text: { text: content },
    distribution: {
      linkedInDistributionTarget: {
        visibleToGuest: true,
      },
    },
    ...(shareContent ? { content: shareContent } : {}),
  };

  const res = await fetch("https://api.linkedin.com/v2/shares", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(sharesBody),
  });

  if (!res.ok) {
    const err = await res.text();
    return { postUrn: null, error: `LinkedIn Shares API error (${res.status}): ${err.slice(0, 300)}` };
  }

  const data = await res.json();
  const postUrn: string = data?.id ?? data?.activity ?? "";
  return { postUrn, error: null };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encryptionKey = Deno.env.get("LINKEDIN_ENCRYPTION_KEY");

  // Authenticate caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userToken = authHeader.replace("Bearer ", "");
  const userSupabase = createClient(supabaseUrl, userToken, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userSupabase.auth.getUser();
  if (authErr || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Parse body
  let body: {
    account_id?: string;
    post_type?: string;
    content?: string;
    media_asset_id?: string;
    article_url?: string;
    article_title?: string;
    article_desc?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const {
    account_id,
    post_type,
    content = "",
    media_asset_id,
    article_url,
    article_title,
    article_desc,
  } = body;

  // -------------------------------------------------------------------------
  // Server-side validation
  // -------------------------------------------------------------------------

  if (!account_id) {
    return jsonResponse({ error: "Missing required field: account_id" }, 400);
  }
  if (!post_type || !VALID_POST_TYPES.includes(post_type)) {
    return jsonResponse({ error: `post_type must be one of: ${VALID_POST_TYPES.join(", ")}` }, 400);
  }
  if (content.length > MAX_CHARS) {
    return jsonResponse({ error: `Content/caption exceeds ${MAX_CHARS} character limit` }, 400);
  }
  if (post_type === "image" && !media_asset_id) {
    return jsonResponse({ error: "media_asset_id is required for image posts" }, 400);
  }
  if (post_type === "article") {
    if (!article_url) {
      return jsonResponse({ error: "article_url is required for article posts" }, 400);
    }
    try {
      const u = new URL(article_url);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad protocol");
    } catch {
      return jsonResponse({ error: "article_url must be a valid http/https URL" }, 400);
    }
  }

  try {
    // -----------------------------------------------------------------------
    // Load account
    // -----------------------------------------------------------------------

    const { data: account, error: accountErr } = await supabase
      .from("linkedin_accounts")
      .select("*")
      .eq("id", account_id)
      .eq("is_active", true)
      .single();

    if (accountErr || !account) {
      return jsonResponse({ error: "LinkedIn account not found or inactive" }, 404);
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
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // Check token expiry
    if (new Date(account.token_expires_at) < new Date()) {
      return jsonResponse(
        { error: "LinkedIn access token expired. Please reconnect your account at /linkedin." },
        401
      );
    }

    // -----------------------------------------------------------------------
    // Server-side image validation via Supabase Storage metadata
    // -----------------------------------------------------------------------

    let assetFilePath: string | null = null;
    let imageMimeType = "image/jpeg";

    if (post_type === "image" && media_asset_id) {
      // 1. Fetch the file_path from media_assets table
      const { data: assetRow, error: assetErr } = await supabase
        .from("media_assets")
        .select("file_path, mime_type")
        .eq("id", media_asset_id)
        .single();

      if (assetErr || !assetRow) {
        return jsonResponse({ error: "media_asset_id not found in media_assets table" }, 400);
      }

      assetFilePath = assetRow.file_path as string;
      imageMimeType = (assetRow.mime_type as string) || "image/jpeg";

      // 2. Validate via Storage metadata: path prefix is linkedin/images/
      const fileName = assetFilePath.split("/").pop()!;
      const folder = assetFilePath.substring(0, assetFilePath.lastIndexOf("/"));

      const { data: fileList, error: listErr } = await supabase.storage
        .from("media")
        .list(folder, { search: fileName });

      if (listErr || !fileList || fileList.length === 0) {
        return jsonResponse({ error: "Image file not found in storage" }, 400);
      }

      const fileObj = fileList[0];
      const storedSize: number = fileObj.metadata?.size ?? 0;
      const storedMime: string = fileObj.metadata?.mimetype ?? imageMimeType;

      if (storedSize > MAX_IMAGE_BYTES) {
        return jsonResponse({ error: "Image exceeds 5MB limit" }, 400);
      }
      if (!ALLOWED_IMAGE_TYPES.includes(storedMime)) {
        return jsonResponse({ error: `Invalid image type: ${storedMime}. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}` }, 400);
      }

      // Use the MIME type from storage metadata for the upload step
      imageMimeType = storedMime;
    }

    // -----------------------------------------------------------------------
    // Create post record in DB (uploading state for image, publishing for others)
    // -----------------------------------------------------------------------

    const initialStatus = post_type === "image" ? "publishing" : "publishing";

    const { data: post, error: postErr } = await supabase
      .from("linkedin_posts")
      .insert({
        account_id,
        content: content.trim(),
        post_type,
        media_asset_id: media_asset_id ?? null,
        article_url: article_url ?? null,
        status: initialStatus,
        created_by: user.id,
      })
      .select()
      .single();

    if (postErr || !post) {
      console.error("❌ Failed to create post record:", postErr);
      return jsonResponse({ error: "Failed to create post record" }, 500);
    }

    // -----------------------------------------------------------------------
    // Decrypt access token
    // -----------------------------------------------------------------------

    const { token: accessToken, error: tokenErr } = await decryptToken(
      supabase,
      account.access_token_encrypted as string,
      encryptionKey
    );

    if (!accessToken) {
      await supabase
        .from("linkedin_posts")
        .update({ status: "failed", error_message: tokenErr })
        .eq("id", post.id);
      return jsonResponse({ error: tokenErr ?? "Failed to decrypt token" }, 500);
    }

    // -----------------------------------------------------------------------
    // Determine author URN format
    // Personal: urn:li:person:<id>  |  Company: urn:li:organization:<id>
    // -----------------------------------------------------------------------

    const authorUrn: string = account.linkedin_urn;
    const isCompany = isOrgUrn(authorUrn);

    console.log(
      `📤 Publishing ${post_type} post as ${isCompany ? "company" : "personal"} ` +
      `account: ${account.account_name}`
    );

    // -----------------------------------------------------------------------
    // Image upload to LinkedIn (if needed)
    // -----------------------------------------------------------------------

    let linkedinAssetUrn: string | undefined;

    if (post_type === "image" && assetFilePath) {
      // Download image from Supabase Storage
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from("media")
        .download(assetFilePath);

      if (downloadErr || !fileData) {
        const errMsg = `Failed to download image from storage: ${downloadErr?.message}`;
        await supabase
          .from("linkedin_posts")
          .update({ status: "failed", error_message: errMsg })
          .eq("id", post.id);
        return jsonResponse({ error: errMsg }, 500);
      }

      const imageBytes = new Uint8Array(await fileData.arrayBuffer());

      const { assetUrn, error: uploadErr } = await registerAndUploadImage(
        accessToken,
        authorUrn,
        imageBytes,
        imageMimeType
      );

      if (!assetUrn || uploadErr) {
        // Cleanup: remove the orphaned media reference from DB
        await supabase
          .from("linkedin_posts")
          .update({
            status: "failed",
            error_message: uploadErr ?? "LinkedIn image upload failed",
            media_asset_id: null,
          })
          .eq("id", post.id);
        return jsonResponse({ error: uploadErr ?? "LinkedIn image upload failed" }, 502);
      }

      linkedinAssetUrn = assetUrn;
      console.log(`✅ Image uploaded to LinkedIn: ${linkedinAssetUrn}`);
    }

    // -----------------------------------------------------------------------
    // Publish to LinkedIn
    // -----------------------------------------------------------------------

    let postUrn: string | null = null;
    let publishError: string | null = null;

    if (isCompany) {
      // Company pages → Shares API
      const result = await publishCompanyShare(
        accessToken,
        authorUrn,
        content.trim(),
        post_type,
        linkedinAssetUrn,
        article_url,
        article_title,
        article_desc
      );
      postUrn = result.postUrn;
      publishError = result.error;
    } else {
      // Personal accounts → UGC Posts API
      const result = await publishUgcPost(
        accessToken,
        authorUrn,
        content.trim(),
        post_type,
        linkedinAssetUrn,
        article_url,
        article_title,
        article_desc
      );
      postUrn = result.postUrn;
      publishError = result.error;
    }

    if (!postUrn || publishError) {
      console.error("❌ LinkedIn publish failed:", publishError);

      // On image posts: clean up the storage file on publish failure
      if (post_type === "image" && assetFilePath) {
        await supabase.storage.from("media").remove([assetFilePath]);
      }

      await supabase
        .from("linkedin_posts")
        .update({
          status: "failed",
          error_message: publishError ?? "LinkedIn publish failed",
          ...(post_type === "image" ? { media_asset_id: null } : {}),
        })
        .eq("id", post.id);

      // Surface auth errors clearly
      if (publishError?.includes("401") || publishError?.includes("403")) {
        return jsonResponse(
          { error: "LinkedIn authorization failed. Your token may have been revoked. Please reconnect your account at /linkedin." },
          401
        );
      }

      return jsonResponse({ error: publishError ?? "Failed to publish to LinkedIn" }, 502);
    }

    // -----------------------------------------------------------------------
    // Update post record with success
    // -----------------------------------------------------------------------

    console.log(`✅ LinkedIn post published: ${postUrn}`);

    const { error: updateErr } = await supabase
      .from("linkedin_posts")
      .update({
        post_urn: postUrn,
        status: "published",
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (updateErr) {
      // Non-fatal: post was published successfully
      console.error("⚠️ Failed to update post record after publish:", updateErr);
    }

    return jsonResponse({ success: true, post_id: post.id, post_urn: postUrn });
  } catch (err: any) {
    console.error("❌ linkedin-publish unexpected error:", err);
    return jsonResponse({ error: err?.message ?? "Internal server error" }, 500);
  }
});
