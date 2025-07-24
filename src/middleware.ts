import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";

export default async function middleware(request: NextRequest) {
  // 获取当前用户会话
  const session = await auth();
  
  const path = request.nextUrl.pathname;
  
  // 对于登录页面，如果已经登录则重定向到首页
  if (path === "/login") {
    if (session?.user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }
  
  // 对于API认证路由，直接放行
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  
  // 对于受保护的路由，检查是否已登录
  const protectedPaths = ["/"];
  const isProtectedPath = protectedPaths.some(protectedPath => 
    path === protectedPath || path.startsWith(protectedPath + "/")
  );
  
  if (isProtectedPath && !session?.user) {
    // 未登录用户重定向到登录页
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
}; 