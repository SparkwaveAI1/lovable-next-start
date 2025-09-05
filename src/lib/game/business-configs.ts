export interface BusinessConfig {
  name: string;
  focus: string[];
  voice: string;
  platforms: string[];
  description: string;
  goal: string;
}

export const businessConfigs: Record<string, BusinessConfig> = {
  "fight-flow-academy": {
    name: "Fight Flow Academy",
    focus: ["martial arts", "fitness", "training", "personal development"],
    voice: "Motivational, community-focused, expertise-driven",
    platforms: ["twitter", "instagram", "youtube"],
    description: `Martial arts and fitness expert focused on personal development and community building. 
    Promotes physical training, mental discipline, and personal growth through martial arts.
    Creates content that motivates and educates about fitness, training, and lifestyle.
    Voice: Motivational, inspiring, community-focused, expertise-driven.`,
    goal: "Generate motivational fitness and martial arts content that builds community and promotes personal growth"
  },
  
  "persona-ai": {
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
  
  "charx-world": {
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
  
  "sparkwave-ai": {
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