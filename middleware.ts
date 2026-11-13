import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Helper to create a redirect response that preserves refreshed Supabase session cookies
  const createRedirect = (target: URL | string) => {
    const redirectResponse = NextResponse.redirect(target)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  const { pathname } = request.nextUrl

  // Public auth paths (login, register, forgot password, etc.)
  const isPublicAuthPath =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/register')

  // Fast-path: Static files and assets that don't need auth checks.
  // NOTE (S14/B27): the old exemption for everything under /api/auth/* is
  // gone — no route lives under app/api/auth/ (the callback is the page
  // route app/auth/callback/route.ts, already covered by the /auth public
  // path). The only API route, /api/upload-image, now goes through the
  // auth checks below like any other route.
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'

  if (isStaticAsset) {
    return supabaseResponse
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[Middleware] Supabase environment variables missing')
    // Fail CLOSED (S14/B27): never pass a protected request through with no
    // auth possible. Public auth pages still need to render (otherwise the
    // login page itself would redirect-loop), so only they pass through.
    if (isPublicAuthPath) {
      return supabaseResponse
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    return createRedirect(loginUrl)
  }

  try {
    // ── Refresh the Supabase session cookie ───────────────────────────────
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
            )
          },
        },
      }
    )

    // ── Fetch the authenticated user (safely with catch) ──────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))

    // ── MFA state helper (function #19) ──────────────────────────────────
    // Is this session still password-only (aal1) while a verified TOTP
    // factor exists? getAuthenticatorAssuranceLevel() is LOCAL here: it
    // decodes the JWT's `aal` claim and reads `session.user.factors`,
    // so it adds no network round-trip beyond the getUser() above. Any
    // failure fails OPEN (returns false): a user without MFA must never
    // be locked out by this check, and the login page is the primary
    // enforcement — this guard is the second layer for anyone who
    // reaches a protected route with an aal1 session (e.g. a stale
    // bookmark, or a session created before MFA was enrolled).
    const isMfaPending = async (): Promise<boolean> => {
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        return aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2'
      } catch {
        return false
      }
    }

    // Redirect to the MFA verify step, preserving the intended destination
    // (validated again on the verify page — same-origin relative only).
    const mfaRedirect = (next: string) => {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/mfa-verify'
      url.search = ''
      url.searchParams.set('next', next)
      return createRedirect(url)
    }

    // ── Root route ('/') fast redirect directly at the Edge ─────────────
    if (pathname === '/') {
      if (!user) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/auth/login'
        return createRedirect(loginUrl)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const targetUrl = request.nextUrl.clone()
      targetUrl.pathname = profile?.role === 'admin' ? '/admin' : '/dashboard'
      if (await isMfaPending()) {
        return mfaRedirect(targetUrl.pathname)
      }
      return createRedirect(targetUrl)
    }

    // If an active authenticated user visits /auth/login, redirect to their portal
    if (user && pathname === '/auth/login') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .maybeSingle()

      if (profile && profile.status === 'active') {
        const targetUrl = request.nextUrl.clone()
        targetUrl.pathname = profile.role === 'admin' ? '/admin' : '/dashboard'
        if (await isMfaPending()) {
          return mfaRedirect(targetUrl.pathname)
        }
        return createRedirect(targetUrl)
      }
    }

    // Public auth pages when not logged in -> let through
    if (isPublicAuthPath) {
      return supabaseResponse
    }

    // ── Not authenticated on protected route → redirect to login ─────────
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      loginUrl.searchParams.set('redirectTo', pathname)
      return createRedirect(loginUrl)
    }

    // ── Fetch the user's role from the profiles table ─────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle()

    // If profile doesn't exist yet, redirect to login to retry
    if (!profile) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      return createRedirect(loginUrl)
    }

    if (profile.status !== 'active') {
      if (pathname !== '/auth/pending') {
        const pendingUrl = request.nextUrl.clone()
        pendingUrl.pathname = '/auth/pending'
        pendingUrl.searchParams.set('status', profile.status ?? 'inactive')
        return createRedirect(pendingUrl)
      }
      return supabaseResponse
    }

    const role = profile.role

    // ── MFA enforcement (function #19) ──────────────────────────────────
    // A password-only (aal1) session with an enrolled verified factor may
    // not enter /admin or /dashboard until the verify step upgrades it to
    // aal2. /auth/* — including /auth/mfa-verify itself — already returned
    // above, so this cannot loop; API routes are untouched (a redirect
    // would break them). Fail-open on any AAL-check failure (see helper).
    if (
      (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) &&
      (await isMfaPending())
    ) {
      return mfaRedirect(request.nextUrl.pathname + request.nextUrl.search)
    }

    // ── Route protection ──────────────────────────────────────────────────
    // /admin/* → admin only
    if (pathname.startsWith('/admin') && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'salesman' ? '/dashboard' : '/auth/login'
      return createRedirect(url)
    }

    // /dashboard/* → salesman only — EXCEPT when admin has view_as_user_id cookie (impersonation)
    if (pathname.startsWith('/dashboard') && role !== 'salesman') {
      const viewAsCookie = request.cookies.get('view_as_user_id')?.value
      if (role === 'admin' && viewAsCookie) {
        // Admin is impersonating a student — allow through
        return supabaseResponse
      }
      const url = request.nextUrl.clone()
      url.pathname = role === 'admin' ? '/admin' : '/auth/login'
      return createRedirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error('[Middleware] Unexpected error:', error)
    // Fail CLOSED (S14/B27): on any unexpected error (DB outage, network
    // failure, …) send the user to login instead of letting the request
    // through to a protected page with no role check. Public auth pages
    // pass through so a broken middleware never redirect-loops the login
    // page itself.
    if (isPublicAuthPath) {
      return supabaseResponse
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    return createRedirect(loginUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static (static files)
     *  - _next/image (image optimisation)
     *  - favicon.ico, robots.txt, sitemap.xml
     *  - Static image/font/audio files
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|mp3|wav|mp4|webm)$).*)',
  ],
}

