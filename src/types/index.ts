// Shared TypeScript types for the COD Command Center

export type ProductStatus = 'Testing' | 'Scaling' | 'Winner' | 'Killed' | 'Paused'
export type LandingPageStatus = 'Active' | 'Paused' | 'Archived'
export type OrderStatus =
  | 'New'
  | 'Confirmed'
  | 'No Answer'
  | 'Wrong Number'
  | 'Cancelled'
  | 'Shipped'
  | 'Delivered'
  | 'Returned'
  | 'Paid'

export interface Product {
  id: string
  product_name: string
  sku: string | null
  country: string | null
  currency: string | null
  selling_price: number | null
  product_cost: number | null
  shipping_cost: number | null
  return_cost: number | null
  call_center_cost: number | null
  status: ProductStatus
  created_at: string
  updated_at: string
}

export interface LandingPage {
  id: string
  product_id: string
  page_name: string
  live_url: string | null
  market: string | null
  language: string | null
  offer_name: string | null
  api_key: string
  status: LandingPageStatus
  created_at: string
  updated_at: string
  product?: Product
}

export interface Order {
  id: string
  order_number: string
  product_id: string | null
  landing_page_id: string | null
  customer_name: string
  phone: string
  city: string
  address: string
  package_name: string | null
  quantity: number
  order_value: number
  currency: string
  status: OrderStatus
  notes: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  campaign_id: string | null
  adset_id: string | null
  ad_id: string | null
  platform: string | null
  device: string | null
  browser: string | null
  user_agent: string | null
  ip_address: string | null
  created_at: string
  updated_at: string
  product?: Product
  landing_page?: LandingPage
}

export interface OrderEvent {
  id: string
  landing_page_id: string | null
  product_id: string | null
  order_id: string | null
  event_type: string
  event_data: Record<string, unknown>
  session_id: string | null
  visitor_id: string | null
  created_at: string
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface OrderSubmissionPayload {
  landing_page_api_key: string
  customer_name: string
  phone: string
  city: string
  address: string
  package_name?: string
  quantity: number
  order_value: number
  currency: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  campaign_id?: string
  adset_id?: string
  ad_id?: string
  platform?: string
  device?: string
  browser?: string
  user_agent?: string
}
