import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase client for use in Client Components.
 * Uses the anon/publishable key — safe to expose in the browser.
 * RLS policies on the database are the true security boundary.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
