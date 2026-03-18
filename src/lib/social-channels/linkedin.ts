import { SocialChannel, PostResult } from './types';
import { supabase } from '@/integrations/supabase/client';

export const linkedInChannel: SocialChannel = {
  id: 'linkedin',
  name: 'LinkedIn',
  charLimit: 3000,
  getCharCount: (content: string) => content.length,
  validate: (content: string) => {
    if (!content.trim()) {
      return { valid: false, error: 'Content cannot be empty' };
    }
    if (content.length > 3000) {
      return { valid: false, error: `Content exceeds 3,000 character limit (${content.length} chars)` };
    }
    return { valid: true };
  },
};

export async function postToLinkedIn(
  content: string,
  accountId: string,
  businessId: string
): Promise<PostResult> {
  try {
    const { data, error } = await supabase.functions.invoke('linkedin-publish-text', {
      body: {
        account_id: accountId,
        content: content.trim(),
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return { channelId: 'linkedin', success: true, message: 'Posted successfully to LinkedIn' };
  } catch (err: any) {
    // Exponential backoff helper (used externally when needed)
    const msg = err?.message || err?.context?.responseText || 'Failed to publish to LinkedIn';
    return { channelId: 'linkedin', success: false, error: msg };
  }
}
