import { generateContent as gameGenerateContent, GameContentResponse } from "@/lib/game/game-client";
import { getBusinessConfig } from "@/lib/game/business-configs";

export interface ContentGenerationResult {
  success: boolean;
  content?: string;
  message: string;
  requestId?: string;
  metadata?: {
    business: string;
    contentType: string;
    topic: string;
    platform: string;
    timestamp: string;
  };
}

export interface ScheduledContent {
  id: string;
  business: string;
  contentType: string;
  content: string;
  scheduledFor: Date;
  platform: string;
  status: 'pending' | 'posted' | 'failed';
  createdAt: Date;
}

/**
 * Generate content using the GAME SDK integration
 * Wrapper around the game-client with business-specific configurations
 */
export async function generateContent(
  businessKey: string,
  contentType: string,
  topic: string
): Promise<ContentGenerationResult> {
  try {
    // Get business configuration
    const businessConfig = getBusinessConfig(businessKey);
    if (!businessConfig) {
      throw new Error(`Unknown business: ${businessKey}`);
    }

    // Call the GAME SDK through our edge function
    const gameResponse: GameContentResponse = await gameGenerateContent(
      businessConfig.name,
      contentType,
      topic
    );

    if (!gameResponse.success) {
      throw new Error(gameResponse.message || "Content generation failed");
    }

    // Extract content from the response
    let content = "";
    if (gameResponse.testResult?.content) {
      content = gameResponse.testResult.content;
    } else if (gameResponse.message) {
      content = gameResponse.message;
    }

    return {
      success: true,
      content,
      message: "Content generated successfully",
      requestId: gameResponse.requestId,
      metadata: {
        business: businessConfig.name,
        contentType,
        topic,
        platform: extractPlatformFromContentType(contentType),
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error("Content service error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
      metadata: {
        business: businessKey,
        contentType,
        topic,
        platform: extractPlatformFromContentType(contentType),
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Schedule content for later posting
 * Note: This is a placeholder for future implementation
 */
export async function scheduleContent(
  content: string,
  businessKey: string,
  contentType: string,
  scheduledFor: Date,
  platform: string
): Promise<{ success: boolean; scheduleId?: string; message: string }> {
  // Placeholder implementation
  console.log("Scheduling content:", {
    content,
    businessKey,
    contentType,
    scheduledFor,
    platform
  });

  return {
    success: true,
    scheduleId: `schedule_${Date.now()}`,
    message: "Content scheduled successfully (placeholder implementation)"
  };
}

/**
 * Get content generation history
 * Note: This is a placeholder for future implementation with database
 */
export async function getContentHistory(
  businessKey?: string,
  limit: number = 50
): Promise<{ success: boolean; content: any[]; message: string }> {
  // Placeholder implementation
  console.log("Getting content history:", { businessKey, limit });

  return {
    success: true,
    content: [],
    message: "Content history feature coming soon"
  };
}

/**
 * Extract platform from content type
 */
function extractPlatformFromContentType(contentType: string): string {
  const platformMap: Record<string, string> = {
    twitter_post: "twitter",
    discord_message: "discord",
    telegram_post: "telegram",
    linkedin_post: "linkedin"
  };

  return platformMap[contentType] || "unknown";
}

/**
 * Get supported content types for a business
 */
export function getSupportedContentTypes(businessKey: string): string[] {
  const businessConfig = getBusinessConfig(businessKey);
  if (!businessConfig) return [];

  // Map platforms to content types
  const contentTypes: string[] = [];
  businessConfig.platforms.forEach(platform => {
    switch (platform) {
      case "twitter":
        contentTypes.push("twitter_post");
        break;
      case "discord":
        contentTypes.push("discord_message");
        break;
      case "telegram":
        contentTypes.push("telegram_post");
        break;
      case "linkedin":
        contentTypes.push("linkedin_post");
        break;
    }
  });

  return contentTypes;
}