/**
 * Idempotency hash for scheduled posts.
 * Stable across Node and Deno using Web Crypto API.
 * Result: lowercase hex SHA-256.
 */
export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);

  // Web Crypto is available in modern Node (globalThis.crypto) and Deno.
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    const h = bytes[i].toString(16).padStart(2, "0");
    hex += h;
  }
  return hex;
}

/**
 * Deterministic content hash: platform|content|YYYY-MM-DD
 * - Use date-only to avoid time drift; hashed value is stable for a given publish day.
 */
export async function contentHash(
  platform: "twitter" | "discord" | "telegram",
  content: string,
  scheduledForISO: string
): Promise<string> {
  // Normalize to date-only boundary in UTC
  const day = new Date(scheduledForISO);
  const y = day.getUTCFullYear();
  const m = String(day.getUTCMonth() + 1).padStart(2, "0");
  const d = String(day.getUTCDate()).padStart(2, "0");
  const dateOnly = `${y}-${m}-${d}`;

  return sha256Hex(`${platform}|${content}|${dateOnly}`);
}

/* ─────────────────────────────
Minimal usage example (do not execute here):
const h = await contentHash("twitter", "hello world", "2025-09-03T12:00:00.000Z");
// => "a3b1…(64 hex chars)"
────────────────────────────── */