/**
 * Web Crypto utilities for Supabase Edge (Deno).
 * Returns lowercase hex SHA-256.
 */
export async function sha256Hex(input: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API not available in Edge runtime");
  }
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

/**
 * Deterministic content hash: platform|content|YYYY-MM-DD (UTC)
 */
export async function contentHash(
  platform: "twitter" | "discord" | "telegram",
  content: string,
  scheduledForISO: string
): Promise<string> {
  const day = new Date(scheduledForISO);
  if (Number.isNaN(day.getTime())) {
    throw new Error(`Invalid scheduledForISO date: ${scheduledForISO}`);
  }
  const y = day.getUTCFullYear();
  const m = String(day.getUTCMonth() + 1).padStart(2, "0");
  const d = String(day.getUTCDate()).padStart(2, "0");
  const dateOnly = `${y}-${m}-${d}`;
  return sha256Hex(`${platform}|${content}|${dateOnly}`);
}