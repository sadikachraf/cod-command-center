export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import type { Order, Product, LandingPage } from '@/types'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  // Fetch last 90 days of orders — client-side filtering handles the rest
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [{ data: ordersData }, { data: productsData }, { data: lpsData }] = await Promise.all([
    supabase
      .from('orders')
      .select('*')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('products').select('*').order('product_name'),
    supabase.from('landing_pages').select('*').order('page_name'),
  ])

  const orders   = (ordersData   ?? []) as Order[]
  const products = (productsData ?? []) as Product[]
  const lps      = (lpsData      ?? []) as LandingPage[]

  return (
    <AnalyticsDashboard
      orders={orders}
      products={products}
      lps={lps}
    />
  )
}
