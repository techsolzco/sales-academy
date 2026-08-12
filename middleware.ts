import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // ── Refresh the Supabase session cookie ───────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // ── Fetch the authenticated user (never trust the cookie alone) ────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Public paths that don't require authentication ──────────────────
  const isPublicPath =
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico'

  if (isPublicPath) {
    return supabaseResponse
  }

  // ── Not authenticated → redirect to login ────────────────────────────
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Fetch the user's role from the profiles table ─────────────────────
  // We do this server-side so the client cannot fake their role.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (profile && profile.status !== 'active') {
    if (pathname !== '/auth/pending') {
      const pendingUrl = request.nextUrl.clone()
      pendingUrl.pathname = '/auth/pending'
      return NextResponse.redirect(pendingUrl)
    }
    return supabaseResponse
  }

  const role = profile?.role

  // ── Route protection ──────────────────────────────────────────────────
  // /admin/* → admin only
  if (pathname.startsWith('/admin') && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = role === 'salesman' ? '/dashboard' : '/auth/login'
    return NextResponse.redirect(url)
  }

  // /dashboard/* → salesman only (admins use /admin)
  if (pathname.startsWith('/dashboard') && role !== 'salesman') {
    const url = request.nextUrl.clone()
    url.pathname = role === 'admin' ? '/admin' : '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static (static files)
     *  - _next/image (image optimisation)
     *  - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
