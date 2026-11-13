import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { recordLogin } from '@/lib/actions/login-history'

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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Login history (audit §3 #20) — record the sign-in fire-and-forget:
      // recordLogin never throws, and we never await it, so a history
      // failure can never fail or delay the login. Hooked once here, so
      // BOTH success paths below (password recovery AND normal redirect)
      // are recorded. IP comes from x-forwarded-for (first entry).
      const signedInUserId = data.user?.id
      if (signedInUserId) {
        const forwardedFor = request.headers.get('x-forwarded-for')
        const ip = forwardedFor?.split(',')[0]?.trim() || null
        const userAgent = request.headers.get('user-agent')
        recordLogin(signedInUserId, ip, userAgent).catch((err) => {
          console.error('[auth/callback] recordLogin failed', err)
        })
      }

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
