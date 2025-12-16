import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session-utils';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  // Exclude public assets and API
  const isPublicPath = request.nextUrl.pathname.startsWith('/_next') || 
                       request.nextUrl.pathname.startsWith('/api') || 
                       request.nextUrl.pathname.startsWith('/static') || 
                       request.nextUrl.pathname.includes('.');

  if (!session && !isLoginPage && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  if (session) {
      try {
          await decrypt(session);
      } catch (e) {
          const response = NextResponse.redirect(new URL('/login', request.url));
          response.cookies.delete('session');
          return response;
      }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
