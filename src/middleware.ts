import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/auth/'];

// Refreshes the Supabase session cookie on every request and keeps signed-out
// visitors on /login. getClaims() verifies the JWT locally (no Auth round trip
// unless the token needs refreshing). Data access is still enforced by RLS.
//
// This stays middleware.ts (Edge runtime) rather than Next 16's proxy.ts on
// purpose: proxy runs as its own Node function, and booting it cold added
// ~0.6 s in front of every first request after the app sat idle, which is
// every launch of the installed PWA. Edge middleware starts in milliseconds.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!data && !isPublic && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (data && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|brand/|manifest.webmanifest|sw.js).*)'],
};
