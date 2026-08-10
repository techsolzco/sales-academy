import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client using the SERVICE ROLE KEY.
 *
 * ⚠️  NEVER import this in Client Components or expose it to the browser.
 *     Use ONLY in:
 *       - Server Actions
 *       - API Route Handlers
 *       - Seed / migration scripts
 *
 * The service role key bypasses Row Level Security — treat it like a root password.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'These must be set in your server environment — never in the browser.'
    )
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
