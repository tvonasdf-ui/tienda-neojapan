import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const demoBypass = process.env.AUTH_DEMO_BYPASS === 'true';
  const hasDemoSession = request.cookies.get('neojapan_demo')?.value === '1';

  if (demoBypass && hasDemoSession) {
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const loginUrl = new URL('/login', request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (!url || !anonKey) {
    loginUrl.searchParams.set('error', 'configuration');
    loginUrl.searchParams.set('next', nextPath);
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    loginUrl.searchParams.set('error', 'verification');
    loginUrl.searchParams.set('next', nextPath);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  const role = data.user?.app_metadata.role;
  if (role !== 'ADMIN' && role !== 'STAFF') {
    loginUrl.searchParams.set('error', data.user ? 'role' : 'verification');
    loginUrl.searchParams.set('next', nextPath);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ['/', '/inventario/:path*', '/pos/:path*', '/pedidos/:path*', '/reparaciones/:path*', '/reportes/:path*'],
};
