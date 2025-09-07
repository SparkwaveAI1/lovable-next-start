// scripts/game/twitter.ts
import { GameAgent } from "@virtuals-protocol/game";
import { TWITTER_WORKER_ID, POST_TWEET_FN } from "../../src/lib/game/config";

// NOTE: This script calls a *platform worker* on GAME.
// No Twitter API keys are required. Only GAME_API_KEY is used.

async function main() {
  const apiKey = process.env.GAME_API_KEY;
  if (!apiKey) throw new Error("Missing GAME_API_KEY");

  const agent = new GameAgent(apiKey, {
    name: "PersonaAI Twitter Agent",
    goal: "Post tweets through GAME platform",
    description: "Calls the Virtuals (GAME) Twitter poster worker",
    // No local workers here on purpose — we want the platform worker.
    workers: [],
    getAgentState: async () => ({ mode: "twitter-platform" }),
  });

  await agent.init();

  // Example tweet text; in CI this is just a smoke. You can swap this
  // to pull from a queue or scheduler later.
  const text = "hello from GAME platform twitter smoke test";

  // Call the platform worker function directly
  const step = await agent.step({
    workerId: TWITTER_WORKER_ID,   // <- platform worker id
    fn: POST_TWEET_FN,            // <- platform function name
    args: { text },               // <- GAME will handle Twitter posting
  });

  // Show whatever the platform returns so CI logs are useful
  try {
    console.log("TWITTER RESULT:", JSON.stringify(step));
  } catch {
    console.log("TWITTER RESULT (non-JSON):", String(step));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});