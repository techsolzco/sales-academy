import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * /auth/callback — Supabase PKCE code exchange handler.
 *
 * Supabase sends all email confirmation/recovery links to this route.
 * We exchange the `code` for a real session, then redirect to the
 * correct page depending on what type of flow triggered the email:
 *
 *   - Password recovery  → /auth/reset-password
 *   - Email confirmation → /dashboard (or wherever `next` says)
 *   - Magic link         → /dashboard (or wherever `next` says)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')          // 'recovery' | 'signup' | 'magiclink' | etc.
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // setAll called from Server Component — cookies will be set in middleware
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Password recovery flow → always go to reset-password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      // All other flows → go to `next` param, defaulting to /dashboard
      const redirectTo = next.startsWith('/') ? `${origin}${next}` : `${origin}/dashboard`
      return NextResponse.redirect(redirectTo)
    }
  }

  // Code missing or exchange failed → redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=invalid_reset_link`)
}
