export type DemoTimelineStep = {
  stage: string;
  owner: string;
  evidence: string;
  route: string;
  status: "ready" | "approved" | "evidence";
};

export const aiGrowthHubDemoPackage = {
  businessProfile: {
    name: "Bluebird Family Dental",
    vertical: "Dental / ortho / implants",
    location: "Austin, TX",
    buyer: "Owner-operator practice manager",
    leadSources: ["Website implant consult form", "Google Business Profile calls", "Missed-call text back", "Meta retargeting form"],
    safeDataNote: "Demo-safe static package. No patient names, PHI, real phone numbers, or outbound automations are used.",
  },
  weeklyFocus: {
    title: "Recover unbooked implant consult inquiries",
    target: "Book 3 additional consults from warm inquiries already in the funnel",
    whyNow: "7 of 18 consult inquiries from the last 14 days have no visible follow-up after the first response window.",
  },
  uploadedIntake: {
    fileName: "bluebird-dental-intake-sample.csv",
    rows: 18,
    signals: ["Lead source", "Treatment interest", "First response timestamp", "Last touch", "Booking status", "Objection noted"],
    example: "4 implant consult leads asked about financing; 3 of those are not booked yet.",
  },
  businessBrainInsight: {
    headline: "Financing questions are the conversion bottleneck this week.",
    detail: "The Business Brain flags implant consult leads with financing objections and no follow-up in 24+ hours as the highest-confidence recovery segment.",
    confidence: "High for demo story; needs live CRM + communications connection before production claims.",
  },
  growthAgentAction: {
    recommendation: "Draft a financing-friendly follow-up for 4 warm implant consult leads and create one front-desk call task for each unbooked inquiry.",
    approvalGate: "Practice manager approval required before any customer-facing send.",
    nextPrompt: "Show me the unbooked implant consults with financing questions and draft the safest follow-up.",
  },
  executionEvidence: {
    proof: "Demo run shows 4 drafts prepared, 4 review tasks queued, 0 live messages sent.",
    auditTrail: "Approval event, reviewer, draft copy, target segment, and send status should be visible before production use.",
  },
  timeline: [
    {
      stage: "Business Profile",
      owner: "Setup",
      evidence: "Bluebird Family Dental profile, lead sources, and buyer goal selected.",
      route: "/growth-hub",
      status: "ready",
    },
    {
      stage: "Weekly Focus",
      owner: "Practice manager",
      evidence: "Recover unbooked implant consults from warm inquiries.",
      route: "/growth-hub",
      status: "ready",
    },
    {
      stage: "Uploaded intake",
      owner: "Operator",
      evidence: "18-row static CSV sample with response and booking signals.",
      route: "/growth-hub",
      status: "evidence",
    },
    {
      stage: "Business Brain insight",
      owner: "Business Brain",
      evidence: "Financing questions + stale follow-up identified as the bottleneck.",
      route: "/analytics",
      status: "evidence",
    },
    {
      stage: "Growth Agent proposed action",
      owner: "Growth Agent",
      evidence: "Draft follow-up + create call tasks; approval required.",
      route: "/growth-agent",
      status: "ready",
    },
    {
      stage: "Approval",
      owner: "Human reviewer",
      evidence: "Manager reviews copy, segment, and compliance language before sends.",
      route: "/growth-agent",
      status: "approved",
    },
    {
      stage: "Execution evidence",
      owner: "System log",
      evidence: "4 drafts prepared, 4 review tasks queued, 0 live messages sent in demo mode.",
      route: "/growth-agent",
      status: "evidence",
    },
  ] satisfies DemoTimelineStep[],
} as const;

export function getDemoLoopSummary() {
  const { businessProfile, weeklyFocus, uploadedIntake, growthAgentAction, executionEvidence } = aiGrowthHubDemoPackage;

  return `${businessProfile.name}: ${weeklyFocus.title}. Intake sample has ${uploadedIntake.rows} rows; proposed action is to ${growthAgentAction.recommendation.toLowerCase()} Evidence: ${executionEvidence.proof}`;
}
