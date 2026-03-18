import { SocialChannel, PostResult } from './types';

export const twitterChannel: SocialChannel = {
  id: 'twitter',
  name: 'Twitter / X',
  charLimit: 280,
  getCharCount: (content: string) => content.length,
  validate: (content: string) => {
    if (!content.trim()) {
      return { valid: false, error: 'Content cannot be empty' };
    }
    if (content.length > 280) {
      return { valid: false, error: `Content exceeds 280 character limit (${content.length} chars)` };
    }
    return { valid: true };
  },
};

export async function postToTwitter(
  _content: string,
  _accountId: string,
  _businessId: string
): Promise<PostResult> {
  return {
    channelId: 'twitter',
    success: false,
    error: 'Twitter integration coming soon — OAuth setup required',
  };
}
