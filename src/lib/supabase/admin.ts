import { createClient } from '@supabase/supabase-js'

// This client uses the service role key — NEVER expose to frontend
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  // Support both legacy and new Supabase secret key names
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''

  const isPlaceholder = (v: string) =>
    !v || v.includes('placeholder')

  if (isPlaceholder(url)) {
    throw new Error('[COD Command Center] NEXT_PUBLIC_SUPABASE_URL is missing or placeholder.')
  }
  if (isPlaceholder(serviceKey)) {
    throw new Error(
      '[COD Command Center] SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is missing or placeholder.'
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
