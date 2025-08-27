export interface Business {
  id: string
  name: string
  slug: string
  parent_business_id: string | null
  business_type: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
}