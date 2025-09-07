import { GameAgent } from "@virtuals-protocol/game";
import { createTwitterWorker } from "../../src/lib/game/workers/twitter";

async function main() {
  const apiKey = process.env.GAME_API_KEY;
  if (!apiKey) throw new Error("Missing GAME_API_KEY");

  const twitterWorker = createTwitterWorker();

  const agent = new GameAgent(apiKey, {
    name: "PersonaAI Twitter Agent",
    goal: "Twitter smoke test",
    description: "Verifies Twitter worker in Node",
    getAgentState: async () => ({ mode: "twitter-smoke" }),
    workers: [twitterWorker],
  });

  await agent.init();
  const res = await agent.step({
    workerId: "twitter-poster",
    fn: "post_tweet",
    args: { text: "hello from Twitter smoke test" },
  });
  console.log("RAW STEP RESULT:", JSON.stringify(res));
}

export default main;

// Allow running via `tsx scripts/game/twitter.ts`
const isDirectRun = typeof require === "undefined" ? true : (require as any).main === module;
if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}