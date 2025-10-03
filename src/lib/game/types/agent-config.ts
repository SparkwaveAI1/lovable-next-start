// Agent configuration types for business-specific content generation

export interface AgentPersonality {
  tone: string[];
  style: string[];
  expertise: string[];
  avoid: string[];
}

export interface ContentGuidelines {
  maxLength: {
    twitter: number;
    instagram: number;
    linkedin: number;
  };
  hashtags: {
    preferred: string[];
    max: number;
  };
  callToAction: string[];
  prohibited: string[];
}

export interface BusinessAgentConfig {
  businessId: string;
  businessName: string;
  agentName: string;
  personality: AgentPersonality;
  contentGuidelines: ContentGuidelines;
  brandVoice: string;
  targetAudience: string[];
  coreFocus: string[];
  systemPrompt: string;
}
