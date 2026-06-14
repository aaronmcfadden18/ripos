import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // If logged in and on login page, go to dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard-home', request.url))
  }

  // If not logged in and trying to access dashboard, go to login
  if (!user && (pathname === '/dashboard-home' || pathname.startsWith('/streams') || pathname === '/inventory' || pathname === '/sales' || pathname === '/onboarding')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Subscription gate: paying/trialing users only on core app pages
  const gatedPaths = ['/dashboard-home', '/streams', '/inventory', '/sales', '/clips']
  const isGated = gatedPaths.some(p => pathname === p || pathname.startsWith(p + '/')) || pathname === '/'
  if (user && isGated) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    const status = profile?.subscription_status
    const active = status === 'trialing' || status === 'active'
    if (!active) {
      return NextResponse.redirect(new URL('/pricing', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
