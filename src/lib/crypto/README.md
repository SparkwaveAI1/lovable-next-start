# crypto utils

- `sha256Hex(input: string)` → Promise<string>
- `contentHash(platform, content, scheduledForISO)` → Promise<string>

Use `contentHash()` when preparing a scheduled post. Store its value in `scheduled_content.content_hash`.
If a row with the same `content_hash` and `platform` is already `posted`, skip posting to avoid duplicates.