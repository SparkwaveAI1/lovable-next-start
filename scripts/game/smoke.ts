import { GameAgent, GameWorker, GameFunction } from "@virtuals-protocol/game";

async function main() {
  const apiKey = process.env.GAME_API_KEY;
  if (!apiKey) throw new Error("Missing GAME_API_KEY");

  const echoWorker = new GameWorker({
    id: "echo",
    name: "Echo Worker",
    description: "Returns your message",
    functions: [
      new GameFunction({
        name: "echo",
        description: "Echo a message",
        args: [{ name: "message", type: "string", description: "Text" }] as const,
        executable: async ({ message }) => ({
          ok: true,
          result: { echoed: message, ts: Date.now(), platform: "game-sdk-test" },
        }),
      }),
    ],
    getEnvironment: async () => ({ env: "local-smoke" }),
  });

  const agent = new GameAgent(apiKey, {
    name: "PersonaAI Ops Agent",
    goal: "Ops smoke test",
    description: "Verifies GAME basics in Node",
    getAgentState: async () => ({ mode: "smoke" }),
    workers: [echoWorker],
  });

  await agent.init();
  const res = await agent.step({
    workerId: "echo",
    fn: "echo",
    args: { message: "hello-game" },
  });
  console.log("SMOKE RESULT:", JSON.stringify(res));
}

export default main;

// Allow running via `tsx scripts/game/smoke.ts`
const isDirectRun = typeof require === "undefined" ? true : (require as any).main === module;
if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}