export interface BusinessConfig {
  name: string;
  focus: string[];
  voice: string;
  platforms: string[];
  description: string;
  goal: string;
}

export const businessConfigs: Record<string, BusinessConfig> = {
  personaai: {
    name: "PersonaAI",
    focus: ["AI agents", "behavioral research", "qualitative insights", "personality AI"],
    voice: "Expert but accessible, technically accurate, community-focused",
    platforms: ["twitter", "discord", "telegram"],
    description: `Expert in AI technology, crypto markets, and personality-driven content. 
    Focuses on PersonaAI's unique value proposition in the AI agent space. 
    Creates content that educates about AI personas while building community trust.
    Voice: Professional but approachable, technically accurate, community-focused.`,
    goal: "Generate engaging AI and crypto content that builds PersonaAI brand awareness and community engagement"
  },
  
  charx: {
    name: "CharX World",
    focus: ["character creation", "storytelling", "world building", "digital personas"],
    voice: "Creative, imaginative, community-driven",
    platforms: ["twitter", "discord", "telegram"],
    description: `Creative storytelling and character development expert. 
    Focuses on building immersive digital worlds and compelling character narratives.
    Inspires community creativity and collaboration in character-driven experiences.
    Voice: Creative, engaging, inspiring, community-focused.`,
    goal: "Create compelling character-driven content that inspires creativity and builds engaged storytelling communities"
  },
  
  sparkwave: {
    name: "Sparkwave AI",
    focus: ["AI automation", "business solutions", "technical innovation", "productivity tools"],
    voice: "Professional, authoritative, solution-oriented",
    platforms: ["twitter", "linkedin", "discord"],
    description: `Business AI automation and productivity expert. 
    Focuses on practical AI solutions that drive business value and operational efficiency.
    Creates content that demonstrates clear ROI and actionable insights for business leaders.
    Voice: Professional, authoritative, results-driven, business-focused.`,
    goal: "Generate authoritative business-focused content that showcases AI automation value and drives enterprise adoption"
  }
};

// Helper function to get business config by key
export function getBusinessConfig(businessKey: string): BusinessConfig | null {
  return businessConfigs[businessKey] || null;
}

// Helper function to get all business names
export function getAllBusinessNames(): { key: string; name: string }[] {
  return Object.entries(businessConfigs).map(([key, config]) => ({
    key,
    name: config.name
  }));
}