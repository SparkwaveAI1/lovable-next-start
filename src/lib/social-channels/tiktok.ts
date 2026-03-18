import { SocialChannel, PostResult } from './types';

export const tikTokChannel: SocialChannel = {
  id: 'tiktok',
  name: 'TikTok',
  charLimit: 150,
  getCharCount: (content: string) => content.length,
  validate: (content: string) => {
    if (!content.trim()) {
      return { valid: false, error: 'Content cannot be empty' };
    }
    if (content.length > 150) {
      return { valid: false, error: `Caption exceeds 150 character limit (${content.length} chars)` };
    }
    return { valid: true };
  },
};

export async function postToTikTok(
  _content: string,
  _accountId: string,
  _businessId: string
): Promise<PostResult> {
  return {
    channelId: 'tiktok',
    success: false,
    error: 'TikTok integration coming soon — auth setup required',
  };
}
