import { createBrowserClient } from '@supabase/ssr'

// Support both legacy key names and new Supabase key names
function getSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ''

  // Dev-only diagnostics — never prints full key values
  if (process.env.NODE_ENV === 'development') {
    console.log(
      '[Supabase] URL:',
      url ? `${url.substring(0, 20)}… (length: ${url.length})` : '❌ MISSING'
    )
    console.log(
      '[Supabase] Anon Key:',
      anonKey ? `${anonKey.substring(0, 8)}… (length: ${anonKey.length})` : '❌ MISSING'
    )
  }

  // Validate — catch placeholder values
  const isPlaceholderUrl =
    !url ||
    url === 'https://placeholder.supabase.co' ||
    url.includes('placeholder')

  const isPlaceholderKey =
    !anonKey ||
    anonKey === 'placeholder-anon-key' ||
    anonKey === 'placeholder-key' ||
    anonKey.startsWith('placeholder')

  if (isPlaceholderUrl || isPlaceholderKey) {
    const missing = []
    if (isPlaceholderUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (isPlaceholderKey)
      missing.push(
        'NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)'
      )

    const msg = `[COD Command Center] Missing Supabase credentials in .env.local:\n  → ${missing.join('\n  → ')}\n\nEdit cod-command-center/.env.local with your real Supabase project values.\nFind them at: https://supabase.com/dashboard/project/_/settings/api`

    if (process.env.NODE_ENV === 'development') {
      // In development: log clearly and throw so the error is obvious
      console.error(msg)
    }
    throw new Error(msg)
  }

  return { url, anonKey }
}

export function createClient() {
  const { url, anonKey } = getSupabaseConfig()
  return createBrowserClient(url, anonKey)
}
