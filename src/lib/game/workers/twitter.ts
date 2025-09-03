import { GameWorker, GameFunction } from "@virtuals-protocol/game";

/**
 * Real Twitter worker skeleton using GAME SDK types.
 * NOTE: This intentionally throws so we don't silently "mock" posting.
 * Wire the actual GAME call here once the smoke test proves the SDK works in Node.
 */
export function createTwitterWorker() {
  return new GameWorker({
    id: "twitter-poster",
    name: "Twitter Poster (GAME)",
    description: "Posts tweets via GAME SDK (real integration, not mock)",
    functions: [
      new GameFunction({
        name: "post_tweet",
        description: "Post a tweet to X/Twitter via GAME",
        args: [
          { name: "text", type: "string", description: "Tweet body (<= 280 chars)" },
          // Future: media attachments, reply-to, etc.
        ] as const,
        executable: async ({ text }) => {
          // Guardrails: length check up front (kept here to avoid platform surprises)
          if (typeof text !== "string" || text.length === 0) {
            throw new Error("text is required");
          }
          if (text.length > 280) {
            throw new Error("text exceeds 280 characters");
          }

          // IMPORTANT:
          // Do not simulate success here. Until we wire the real GAME call,
          // we fail loudly so tests cannot be mistaken for production success.
          // Replace the throw below with the real GAME SDK platform call and
          // return its ExecutableGameFunctionResponse.
          throw new Error("Twitter worker not wired to GAME SDK yet");
        },
      }),
    ],
    getEnvironment: async () => ({ platform: "twitter" }),
  });
}