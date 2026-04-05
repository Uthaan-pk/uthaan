import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths that are always public (no auth / school check needed)
const PUBLIC_PATHS = ['/login', '/auth', '/suspended', '/_next', '/favicon.ico']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through static/public paths immediately
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Build a response we can attach cookie mutations to
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Create a Supabase client that can read/write cookies on this request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session (keeps tokens alive) — do NOT remove this
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Let unauthenticated requests through (page-level guards handle redirects)
    return response
  }

  // Read role + school from user_roles
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData) return response

  const { role, school_id } = roleData as { role: string; school_id: string | null }

  // ── /superadmin guard ────────────────────────────────────────────────────
  if (pathname.startsWith('/superadmin') && role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── Redirect superadmin away from /dashboard (unless impersonating) ───────
  if (pathname === '/dashboard' && role === 'superadmin') {
    const impersonating = request.cookies.get('impersonate_school_id')?.value
    if (!impersonating) {
      return NextResponse.redirect(new URL('/superadmin', request.url))
    }
  }

  // ── Suspension check (skip for superadmin) ───────────────────────────────
  if (role !== 'superadmin' && school_id) {
    const { data: school } = await supabase
      .from('schools')
      .select('is_active')
      .eq('id', school_id)
      .single()

    if (school && school.is_active === false) {
      return NextResponse.redirect(new URL('/suspended', request.url))
    }
  }

  // ── Superadmin impersonation: inject effective school_id as a header ──────
  // Middleware can set request headers that server components can read.
  if (role === 'superadmin') {
    const impersonateId = request.cookies.get('impersonate_school_id')?.value

    if (impersonateId) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-effective-school-id', impersonateId)

      return NextResponse.next({ request: { headers: requestHeaders } })
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, robots.txt, sitemap.xml
     * - any file with an extension (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)',
  ],
}
