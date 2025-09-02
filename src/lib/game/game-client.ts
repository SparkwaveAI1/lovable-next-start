// GAME SDK client configuration - Secure Edge Function approach
import { supabase } from '@/integrations/supabase/client';

export interface GameContentRequest {
  business: string;
  contentType: string;
  topic: string;
}

export interface GameContentResponse {
  success: boolean;
  message: string;
  config?: any;
  apiKeyConfigured?: boolean;
  agentInitialized?: boolean;
  testResult?: any;
  requestId?: string;
  error?: string;
}

export async function generateContent(
  business: string, 
  contentType: string, 
  topic: string
): Promise<GameContentResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('game-content-generator', {
      body: { business, contentType, topic }
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('GAME client error:', error);
    throw error;
  }
}

// Basic configuration for frontend reference
export const gameConfig = {
  environment: "production",
  edgeFunction: "game-content-generator"
};