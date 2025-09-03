#!/usr/bin/env tsx
// GAME SDK Smoke Test - Phase A
// Tests basic SDK instantiation and function execution

import { GameAgent } from "@virtuals-protocol/game";

console.log("🔥 Starting GAME SDK Smoke Test...");

async function runSmokeTest() {
  try {
    console.log("📦 Testing GameAgent instantiation...");
    
    // Test 1: Basic GameAgent constructor
    const agent = new GameAgent({
      name: "smoke-test-agent",
      goal: "Test basic SDK functionality",
      description: "Minimal agent for testing GAME SDK integration",
      functions: [{
        name: "echo_test",
        description: "Echo back input to test function execution",
        args: [
          { name: "message", type: "string", description: "Message to echo back" }
        ] as const,
        executable: async (args: { message: string }) => {
          console.log("🎯 Function executed with:", args);
          return {
            ok: true,
            result: {
              echoed: args.message,
              ts: new Date().toISOString(),
              platform: "game-sdk-test"
            }
          };
        }
      }]
    });

    console.log("✅ GameAgent created successfully");
    console.log("Agent config:", {
      name: agent.name,
      goal: agent.goal,
      description: agent.description
    });

    // Test 2: Agent initialization
    console.log("🚀 Testing agent.init()...");
    await agent.init();
    console.log("✅ Agent initialized successfully");

    // Test 3: Function execution via agent.step()
    console.log("🔧 Testing agent.step() function execution...");
    const stepResult = await agent.step({
      type: "function_call",
      function: "echo_test",
      args: { message: "hello-game" }
    });

    console.log("📋 Step result:", JSON.stringify(stepResult, null, 2));

    // Test 4: Direct function execution
    console.log("🎪 Testing direct function execution...");
    const directResult = await agent.functions[0].executable({ message: "direct-test" });
    console.log("📋 Direct result:", JSON.stringify(directResult, null, 2));

    console.log("🎉 SMOKE TEST PASSED - GAME SDK is functional!");
    return {
      success: true,
      agentCreated: true,
      agentInitialized: true,
      stepExecuted: true,
      directExecuted: true,
      results: { stepResult, directResult }
    };

  } catch (error) {
    console.error("❌ SMOKE TEST FAILED:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };
  }
}

// Execute smoke test
runSmokeTest()
  .then(result => {
    console.log("\n🏁 SMOKE TEST COMPLETED");
    console.log("Final result:", JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log("\n✅ SDK VERIFIED - Ready to proceed to Twitter worker implementation");
    } else {
      console.log("\n❌ SDK INCOMPATIBLE - Need to resolve constructor/execution issues");
    }
    
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error("💥 Unexpected error during smoke test:", error);
    process.exit(1);
  });