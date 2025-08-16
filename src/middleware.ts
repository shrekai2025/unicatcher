import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要认证的路径
const protectedPaths = ['/dashboard', '/tasks', '/tweets', '/extracts', '/x-login', '/viewer'];

// 仅admin可访问的路径
const adminOnlyPaths = ['/dashboard', '/tasks', '/tweets', '/extracts', '/x-login'];

// 仅viewer可访问的路径
const viewerOnlyPaths = ['/viewer'];

// 公开路径（不需要认证）
const publicPaths = ['/login', '/api/health', '/api/external'];

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
    
    if (!authCookie?.value) {
      // 未认证，重定向到登录页
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    try {
      const auth = JSON.parse(decodeURIComponent(authCookie.value));
      if (!auth.isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // 检查角色权限
      const userRole = auth.role;
      const isAdminOnlyPath = adminOnlyPaths.some(path => pathname.startsWith(path));
      const isViewerOnlyPath = viewerOnlyPaths.some(path => pathname.startsWith(path));

      if (isAdminOnlyPath && userRole !== 'admin') {
        // viewer用户访问admin页面，重定向到viewer页面
        const viewerUrl = new URL('/viewer', request.url);
        return NextResponse.redirect(viewerUrl);
      }

      if (isViewerOnlyPath && userRole !== 'viewer' && userRole !== 'admin') {
        // 其他用户访问viewer页面，重定向到dashboard
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
      }

    } catch {
      // Cookie 解析失败，重定向到登录页
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