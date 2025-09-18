import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要认证的路径
const protectedPaths = ['/dashboard', '/tasks', '/tweets', '/extracts', '/tweet-processing', '/x-login', '/viewer'];

// 仅admin可访问的路径
const adminOnlyPaths = ['/dashboard', '/tasks', '/tweets', '/extracts', '/tweet-processing', '/x-login'];

// 仅viewer可访问的路径
const viewerOnlyPaths = ['/viewer'];

// 公开路径（不需要认证）
const publicPaths = ['/login', '/api/health', '/api/external', '/debug-auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 检查是否是公开路径
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // 检查是否是受保护的路径
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  
  if (isProtectedPath) {
    // 检查认证状态（通过 cookie）
    const authCookie = request.cookies.get('unicatcher-auth');
    
    // 调试日志
    console.log(`[Middleware] Checking path: ${pathname}`);
    console.log(`[Middleware] Auth cookie exists: ${!!authCookie?.value}`);
    
    if (!authCookie?.value) {
      // 未认证，重定向到登录页
      console.log(`[Middleware] No auth cookie, redirecting to login`);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    try {
      const auth = JSON.parse(decodeURIComponent(authCookie.value));
      console.log(`[Middleware] Auth data:`, { isAuthenticated: auth.isAuthenticated, role: auth.role });
      
      if (!auth.isAuthenticated) {
        console.log(`[Middleware] Not authenticated, redirecting to login`);
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // 检查角色权限
      const userRole = auth.role;
      const isAdminOnlyPath = adminOnlyPaths.some(path => pathname.startsWith(path));
      const isViewerOnlyPath = viewerOnlyPaths.some(path => pathname.startsWith(path));

      console.log(`[Middleware] Role check:`, { userRole, isAdminOnlyPath, isViewerOnlyPath });

      // 如果role未定义或无效，清除认证并重定向到登录页
      if (!userRole || (userRole !== 'admin' && userRole !== 'viewer')) {
        console.log(`[Middleware] Invalid or undefined role: ${userRole}, redirecting to login`);
        const response = NextResponse.redirect(new URL('/login', request.url));
        // 清除无效的cookie
        response.cookies.set('unicatcher-auth', '', { maxAge: 0, path: '/' });
        return response;
      }

      if (isAdminOnlyPath && userRole !== 'admin') {
        // viewer用户访问admin页面，重定向到viewer页面
        console.log(`[Middleware] Non-admin accessing admin path, redirecting to viewer`);
        const viewerUrl = new URL('/viewer', request.url);
        return NextResponse.redirect(viewerUrl);
      }

      if (isViewerOnlyPath && userRole !== 'viewer' && userRole !== 'admin') {
        // 这个条件现在不应该触发，因为上面已经检查了role的有效性
        console.log(`[Middleware] Invalid role for viewer path, redirecting to login`);
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      console.log(`[Middleware] Access granted for ${pathname}`);

    } catch (error) {
      // Cookie 解析失败，重定向到登录页
      console.log(`[Middleware] Cookie parsing failed:`, error);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // 如果访问根路径，根据用户角色重定向
  if (pathname === '/') {
    const authCookie = request.cookies.get('unicatcher-auth');
    
    if (authCookie?.value) {
      try {
        const auth = JSON.parse(decodeURIComponent(authCookie.value));
        if (auth.isAuthenticated) {
          const redirectPath = auth.role === 'viewer' ? '/viewer' : '/dashboard';
          const redirectUrl = new URL(redirectPath, request.url);
          return NextResponse.redirect(redirectUrl);
        }
      } catch {
        // Cookie解析失败，重定向到登录页
      }
    }
    
    // 未登录或解析失败，重定向到登录页
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}; 