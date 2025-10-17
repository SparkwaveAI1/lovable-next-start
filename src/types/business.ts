export interface Business {
  id: string
  name: string
  slug: string
  parent_business_id: string | null
  business_type: string
  description: string | null
  status: string
  game_twitter_token: string | null
  late_twitter_account_id: string | null
  late_instagram_account_id: string | null
  late_tiktok_account_id: string | null
  late_linkedin_account_id: string | null
  late_facebook_account_id: string | null
  late_profile_id: string | null
  created_at: string
  updated_at: string
}