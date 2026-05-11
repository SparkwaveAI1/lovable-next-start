import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./ContentReviewPage.tsx", import.meta.url), "utf8");

describe("ContentReviewPage approval guardrails", () => {
  it("does not schedule or publish content as a side effect of approval", () => {
    expect(source).not.toContain('from("scheduled_content")');
    expect(source).not.toContain("from('scheduled_content')");
    expect(source).not.toContain("functions.invoke");
  });

  it("makes the approval boundary obvious before Scott clicks approve", () => {
    expect(source).toContain("Approval means: no publish, no schedule, no send");
    expect(source).toContain("Approve for handoff");
    expect(source).toContain("No external distribution happens from this screen");
  });
});
