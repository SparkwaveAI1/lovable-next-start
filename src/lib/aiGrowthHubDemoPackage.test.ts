import { describe, expect, it } from "vitest";
import { aiGrowthHubDemoPackage, getDemoLoopSummary } from "./aiGrowthHubDemoPackage";

describe("aiGrowthHubDemoPackage", () => {
  it("covers every required full-loop stage in order", () => {
    expect(aiGrowthHubDemoPackage.timeline.map(step => step.stage)).toEqual([
      "Business Profile",
      "Weekly Focus",
      "Uploaded intake",
      "Business Brain insight",
      "Growth Agent proposed action",
      "Approval",
      "Execution evidence",
    ]);
  });

  it("keeps the demo package safe and approval-gated", () => {
    expect(aiGrowthHubDemoPackage.businessProfile.safeDataNote).toContain("Demo-safe static package");
    expect(aiGrowthHubDemoPackage.growthAgentAction.approvalGate).toContain("approval required");
    expect(aiGrowthHubDemoPackage.executionEvidence.proof).toContain("0 live messages sent");
  });

  it("summarizes the demo business and execution evidence", () => {
    expect(getDemoLoopSummary()).toContain("Bluebird Family Dental");
    expect(getDemoLoopSummary()).toContain("Intake sample has 18 rows");
    expect(getDemoLoopSummary()).toContain("4 drafts prepared");
  });
});
