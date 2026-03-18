export interface SocialChannel {
  id: string;
  name: string;
  charLimit: number;
  validate: (content: string) => { valid: boolean; error?: string };
  getCharCount: (content: string) => number;
}

export interface PostResult {
  channelId: string;
  success: boolean;
  error?: string;
  message?: string;
}
